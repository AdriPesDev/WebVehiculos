require("dotenv").config();

const express = require("express");
const path = require("node:path");
const fs = require("node:fs");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const multer = require("multer");
const crypto = require("node:crypto");

const app = express();
const port = process.env.PORT || 3000;
const dataFolder = path.join(__dirname, "data");
const usersFile = path.join(dataFolder, "users.json");
const companiesFile = path.join(dataFolder, "companies.json");
const vehiclesFile = path.join(dataFolder, "vehicles.json");
const requestsFile = path.join(dataFolder, "membership_requests.json");
const tripsFile = path.join(dataFolder, "trips.json");
const surveysFile = path.join(dataFolder, "surveys.json");

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const invoicesDir = path.join(__dirname, "uploads", "invoices");
const invoiceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, invoicesDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `inv-${Date.now()}${ext}`);
  },
});
const uploadInvoice = multer({
  storage: invoiceStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".jpg", ".jpeg", ".png"];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});
app.use(
  session({
    secret: process.env.SESSION_SECRET || "nethive-vehiculos-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
  }),
);

// ── Data bootstrap ─────────────────────────────────────────────────────────

function generateRandomPassword(length = 16) {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

function ensureDataFiles() {
  if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
  }

  if (!fs.existsSync(usersFile)) {
    const superadminPassword = process.env.SUPERADMIN_PASSWORD || generateRandomPassword();
    const adminPassword = process.env.ADMIN_PASSWORD || generateRandomPassword();

    const defaultUsers = [
      {
        id: "U-SUPERADMIN-001",
        name: "Superadministrador Nethive",
        email: "superadmin@nethive.com",
        password: bcrypt.hashSync(superadminPassword, 10),
        role: "superadmin",
        company_id: null,
        active: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "U-ADMIN-001",
        name: "Admin Nethive",
        email: "admin@nethive.com",
        password: bcrypt.hashSync(adminPassword, 10),
        role: "admin",
        company_id: "C-NETHIVE-001",
        active: true,
        createdAt: new Date().toISOString(),
      },
    ];
    fs.writeFileSync(usersFile, JSON.stringify(defaultUsers, null, 2), "utf8");

    // Print credentials only on first initialization
    if (!process.env.SUPERADMIN_PASSWORD || !process.env.ADMIN_PASSWORD) {
      console.log("\n" + "=".repeat(60));
      console.log("🔐 INITIAL CREDENTIALS (generated randomly)");
      console.log("=".repeat(60));
      console.log("Superadmin Email: superadmin@nethive.com");
      console.log("Superadmin Password:", superadminPassword);
      console.log("");
      console.log("Admin Email: admin@nethive.com");
      console.log("Admin Password:", adminPassword);
      console.log("=".repeat(60));
      console.log("💡 Save these credentials in a secure place!");
      console.log("💡 Update .env file with these passwords for consistency.\n");
    }
  }

  if (!fs.existsSync(companiesFile)) {
    const defaultCompanies = [
      {
        id: "C-NETHIVE-001",
        name: "Nethive Soluciones Informáticas",
        email: "info@nethive.com",
        admin_id: "U-ADMIN-001",
        createdAt: new Date().toISOString(),
      },
    ];
    fs.writeFileSync(companiesFile, JSON.stringify(defaultCompanies, null, 2), "utf8");
  }

  if (!fs.existsSync(vehiclesFile)) {
    const defaultVehicles = [
      {
        id: "V-001",
        company_id: "C-NETHIVE-001",
        model: "Furgoneta Nethive II",
        plate: "NTH-2026",
        states: ["disponible"],
        capacity: "1.5t",
        location: "Madrid",
        maintenanceStart: null,
        maintenanceEnd: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: "V-002",
        company_id: "C-NETHIVE-001",
        model: "Moto Eléctrica Nethive",
        plate: "NTH-2027",
        states: ["disponible"],
        capacity: "30kg",
        location: "Barcelona",
        maintenanceStart: null,
        maintenanceEnd: null,
        createdAt: new Date().toISOString(),
      },
    ];
    fs.writeFileSync(vehiclesFile, JSON.stringify(defaultVehicles, null, 2), "utf8");
  }

  if (!fs.existsSync(requestsFile)) {
    fs.writeFileSync(requestsFile, JSON.stringify([], null, 2), "utf8");
  }

  if (!fs.existsSync(tripsFile)) {
    fs.writeFileSync(tripsFile, JSON.stringify([], null, 2), "utf8");
  }

  if (!fs.existsSync(surveysFile)) {
    fs.writeFileSync(surveysFile, JSON.stringify([], null, 2), "utf8");
  }

  if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir, { recursive: true });
  }
}

// Initialize data files IMMEDIATELY after function definition
ensureDataFiles();

// ── Helpers ─────────────────────────────────────────────────────────────────

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function getVehicleStates(vehicle) {
  let states = [];
  if (Array.isArray(vehicle.states)) {
    states = vehicle.states.slice();
  } else if (typeof vehicle.states === "string") {
    states = [vehicle.states];
  } else if (typeof vehicle.status === "string") {
    states = [vehicle.status];
  }
  return states.map((s) => String(s || "").trim().toLowerCase()).filter(Boolean);
}

function setVehicleStates(vehicle, states) {
  vehicle.states = Array.isArray(states)
    ? states.map((s) => String(s || "").trim().toLowerCase()).filter(Boolean)
    : [];
  delete vehicle.status;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, company_id: u.company_id, active: u.active, createdAt: u.createdAt };
}

// ── Auth middleware ──────────────────────────────────────────────────────────

function ensureAuthenticated(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "No autenticado." });
  }

  const users = loadJson(usersFile);
  const currentUser = users.find((u) => u.id === req.session.user.id);

  if (!currentUser?.active) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Tu cuenta no está activa." });
  }

  req.session.user = {
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email,
    role: currentUser.role,
    company_id: currentUser.company_id,
  };

  return next();
}

function ensureCompanyAdmin(req, res, next) {
  const role = req.session.user?.role;
  if (role !== "admin" && role !== "empleado" && role !== "superadmin") {
    return res.status(403).json({ error: "Necesitas estar en una empresa." });
  }
  return next();
}

function ensureAdmin(req, res, next) {
  if (req.session.user?.role !== "admin") {
    return res.status(403).json({ error: "Solo administradores." });
  }
  return next();
}

function ensureSuperAdmin(req, res, next) {
  if (req.session.user?.role !== "superadmin") {
    return res.status(403).json({ error: "Solo superadministradores." });
  }
  return next();
}

function ensureAdminOrSuperAdmin(req, res, next) {
  const role = req.session.user?.role;
  if (role !== "admin" && role !== "superadmin") {
    return res.status(403).json({ error: "Solo administradores." });
  }
  return next();
}

// ── Auth routes ──────────────────────────────────────────────────────────────

app.get("/api/auth/me", (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "No autenticado." });
  res.json({ user: req.session.user });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const users = loadJson(usersFile);
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user?.active) {
    return res.status(401).json({ error: "Credenciales incorrectas." });
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Contraseña incorrecta." });
  }

  req.session.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    company_id: user.company_id,
  };

  res.json({ ok: true, user: req.session.user });
});

app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return res.status(400).json({ error: "Todos los campos son obligatorios." });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: "El formato del email no es válido." });
  }

  const users = loadJson(usersFile);

  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: "Email ya registrado." });
  }

  const newUser = {
    id: `U-${Date.now()}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: bcrypt.hashSync(password, 10),
    role: "sin_empresa",
    company_id: null,
    active: true,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveJson(usersFile, users);
  res.status(201).json({ ok: true });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// ── Dashboard ────────────────────────────────────────────────────────────────

app.get("/api/dashboard", ensureAuthenticated, (req, res) => {
  const user = req.session.user;

  if (user.role === "superadmin") {
    const companies = loadJson(companiesFile);
    const users = loadJson(usersFile);
    const vehicles = loadJson(vehiclesFile);
    return res.json({ role: "superadmin", companies, users: users.map(safeUser), vehicles });
  }

  if (user.role === "sin_empresa") {
    return res.json({ role: "sin_empresa", user });
  }

  const companies = loadJson(companiesFile);
  const vehicles = loadJson(vehiclesFile);
  const company = companies.find((c) => c.id === user.company_id);
  const companyVehicles = vehicles.filter((v) => v.company_id === user.company_id);

  if (user.role === "admin") {
    const users = loadJson(usersFile);
    const requests = loadJson(requestsFile);
    const allTrips = loadJson(tripsFile);
    const companyUsers = users.filter((u) => u.company_id === user.company_id).map(safeUser);
    const pendingRequests = requests.filter(
      (r) => r.company_id === user.company_id && r.status === "pending",
    );
    const requestsWithUsers = pendingRequests.map((r) => {
      const requester = users.find((u) => u.id === r.user_id);
      return { ...r, userName: requester?.name || "Desconocido", userEmail: requester?.email || "N/A" };
    });
    const activeTrips = allTrips
      .filter((t) => t.company_id === user.company_id && t.status === "active")
      .map((t) => ({
        ...t,
        driverName: users.find((u) => u.id === t.driver_id)?.name || "Desconocido",
        vehicleModel: companyVehicles.find((v) => v.id === t.vehicle_id)?.model || "—",
        vehiclePlate: companyVehicles.find((v) => v.id === t.vehicle_id)?.plate || "—",
      }));
    return res.json({ role: "admin", company, companyUsers, companyVehicles, pendingRequests: requestsWithUsers, activeTrips });
  }

  if (user.role === "empleado") {
    const allTrips = loadJson(tripsFile);
    const userTrips = allTrips.filter(
      (t) => t.company_id === user.company_id && t.driver_id === user.id,
    );
    const myActiveTrip = allTrips.find(
      (t) => t.driver_id === user.id && t.status === "active" && t.company_id === user.company_id,
    );
    const activeVehicle = myActiveTrip
      ? companyVehicles.find((v) => v.id === myActiveTrip.vehicle_id) || null
      : null;
    return res.json({ role: "empleado", company, companyVehicles, userTrips, myActiveTrip: myActiveTrip || null, activeVehicle });
  }

  res.status(400).json({ error: "Rol no reconocido." });
});

// ── Company routes ───────────────────────────────────────────────────────────

app.get("/api/company/list", ensureAuthenticated, (req, res) => {
  if (req.session.user.role !== "sin_empresa") {
    return res.status(403).json({ error: "Ya perteneces a una empresa." });
  }
  const companies = loadJson(companiesFile);
  res.json({ companies });
});

app.post("/api/company/create", ensureAuthenticated, (req, res) => {
  if (req.session.user.role !== "sin_empresa") {
    return res.status(403).json({ error: "Ya perteneces a una empresa." });
  }

  const { companyName, companyEmail } = req.body;
  const companies = loadJson(companiesFile);
  const users = loadJson(usersFile);

  if (companies.some((c) => c.email.toLowerCase() === companyEmail.toLowerCase())) {
    return res.status(409).json({ error: "Email de empresa ya existe." });
  }

  const newCompany = {
    id: `C-${Date.now()}`,
    name: companyName.trim(),
    email: companyEmail.trim().toLowerCase(),
    admin_id: req.session.user.id,
    createdAt: new Date().toISOString(),
  };

  companies.push(newCompany);
  saveJson(companiesFile, companies);

  const user = users.find((u) => u.id === req.session.user.id);
  user.role = "admin";
  user.company_id = newCompany.id;
  saveJson(usersFile, users);

  req.session.user.role = "admin";
  req.session.user.company_id = newCompany.id;

  res.status(201).json({ ok: true, company: newCompany, user: req.session.user });
});

app.post("/api/company/join/:companyId", ensureAuthenticated, (req, res) => {
  if (req.session.user.role !== "sin_empresa") {
    return res.status(403).json({ error: "Ya perteneces a una empresa." });
  }

  const { companyId } = req.params;
  const companies = loadJson(companiesFile);
  const company = companies.find((c) => c.id === companyId);

  if (!company) {
    return res.status(404).json({ error: "Empresa no encontrada." });
  }

  const requests = loadJson(requestsFile);
  if (requests.some((r) => r.user_id === req.session.user.id && r.company_id === companyId)) {
    return res.status(409).json({ error: "Ya has solicitado unirte a esta empresa." });
  }

  const newRequest = {
    id: `R-${Date.now()}`,
    user_id: req.session.user.id,
    company_id: companyId,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  requests.push(newRequest);
  saveJson(requestsFile, requests);
  res.status(201).json({ ok: true });
});

// ── Admin — membership requests ──────────────────────────────────────────────

app.post("/api/admin/request/:requestId/approve", ensureAuthenticated, ensureAdminOrSuperAdmin, (req, res) => {
  const { requestId } = req.params;
  const { role } = req.body;
  const assignedRole = role === "admin" ? "admin" : "empleado";
  const isSuperadmin = req.session.user.role === "superadmin";

  const requests = loadJson(requestsFile);
  const request = requests.find((r) => r.id === requestId);

  if (!request || (!isSuperadmin && request.company_id !== req.session.user.company_id)) {
    return res.status(404).json({ error: "Solicitud no encontrada." });
  }

  const users = loadJson(usersFile);
  const user = users.find((u) => u.id === request.user_id);
  user.role = assignedRole;
  user.company_id = request.company_id;
  saveJson(usersFile, users);

  request.status = "approved";
  saveJson(requestsFile, requests);

  res.json({ ok: true });
});

app.post("/api/admin/request/:requestId/reject", ensureAuthenticated, ensureAdminOrSuperAdmin, (req, res) => {
  const { requestId } = req.params;
  const isSuperadmin = req.session.user.role === "superadmin";
  const requests = loadJson(requestsFile);
  const request = requests.find((r) => r.id === requestId);

  if (!request || (!isSuperadmin && request.company_id !== req.session.user.company_id)) {
    return res.status(404).json({ error: "Solicitud no encontrada." });
  }

  request.status = "rejected";
  saveJson(requestsFile, requests);
  res.json({ ok: true });
});

// ── Admin — vehicles ─────────────────────────────────────────────────────────

app.post("/api/admin/vehicle/add", ensureAuthenticated, ensureAdminOrSuperAdmin, (req, res) => {
  const { model, plate, capacity, location, companyId } = req.body;
  const isSuperadmin = req.session.user.role === "superadmin";
  const targetCompanyId = isSuperadmin ? companyId : req.session.user.company_id;

  if (!targetCompanyId) {
    return res.status(400).json({ error: "Se requiere una empresa." });
  }

  const vehicles = loadJson(vehiclesFile);

  const newVehicle = {
    id: `V-${Date.now()}`,
    company_id: targetCompanyId,
    model: model.trim(),
    plate: plate.trim().toUpperCase(),
    states: ["disponible"],
    capacity: capacity.trim(),
    location: location.trim(),
    maintenanceStart: null,
    maintenanceEnd: null,
    maintenanceHistory: [],
    createdAt: new Date().toISOString(),
  };

  vehicles.push(newVehicle);
  saveJson(vehiclesFile, vehicles);
  res.status(201).json({ ok: true, vehicle: newVehicle });
});

app.post("/api/admin/vehicle/delete", ensureAuthenticated, ensureAdminOrSuperAdmin, (req, res) => {
  const caller = req.session.user;
  const isSuperadmin = caller.role === "superadmin";
  const { vehicleId } = req.body;
  const vehicles = loadJson(vehiclesFile);
  const vehicle = vehicles.find(
    (v) => v.id === vehicleId && (isSuperadmin || v.company_id === caller.company_id),
  );

  if (!vehicle) {
    return res.status(404).json({ error: "Vehículo no encontrado." });
  }

  const activeStates = new Set(["mantenimiento", "maintenance", "en_uso", "ocupado"]);
  const states = getVehicleStates(vehicle);

  if (states.some((s) => activeStates.has(s))) {
    return res.status(409).json({ error: "No se puede eliminar un vehículo en mantenimiento o en uso." });
  }

  const companyId = isSuperadmin ? vehicle.company_id : caller.company_id;
  const trips = loadJson(tripsFile);
  if (trips.some((t) => t.vehicle_id === vehicleId && t.company_id === companyId && t.status === "active")) {
    return res.status(409).json({ error: "No se puede eliminar un vehículo con un viaje activo." });
  }

  saveJson(vehiclesFile, vehicles.filter((v) => v.id !== vehicleId));
  res.json({ ok: true });
});

app.post("/api/admin/vehicle/reset-state", ensureAuthenticated, ensureAdmin, (req, res) => {
  const { vehicleId } = req.body;
  const vehicles = loadJson(vehiclesFile);
  const vehicle = vehicles.find(
    (v) => v.id === vehicleId && v.company_id === req.session.user.company_id,
  );
  if (!vehicle) return res.status(404).json({ error: "Vehículo no encontrado." });

  const trips = loadJson(tripsFile);
  if (trips.some((t) => t.vehicle_id === vehicleId && t.status === "active")) {
    return res.status(409).json({ error: "Hay un viaje activo. Usa el checkin normal para cerrarlo." });
  }

  vehicle.states = ["disponible"];
  saveJson(vehiclesFile, vehicles);
  res.json({ ok: true });
});

// ── Admin — maintenance ──────────────────────────────────────────────────────

app.post("/api/admin/maintenance/start", ensureAuthenticated, ensureAdminOrSuperAdmin, (req, res) => {
  const caller = req.session.user;
  const isSuperadmin = caller.role === "superadmin";
  const { vehicleId, reason } = req.body;
  const vehicles = loadJson(vehiclesFile);
  const vehicle = vehicles.find(
    (v) => v.id === vehicleId && (isSuperadmin || v.company_id === caller.company_id),
  );

  if (!vehicle) return res.status(404).json({ error: "Vehículo no encontrado." });

  const states = getVehicleStates(vehicle);
  if (!states.includes("mantenimiento")) {
    const newStates = states.filter((s) => s !== "disponible" && s !== "available" && s !== "maintenance");
    newStates.push("mantenimiento");
    setVehicleStates(vehicle, newStates);
  }

  vehicle.maintenanceStart = new Date().toISOString();
  vehicle.maintenanceEnd = null;
  if (!vehicle.maintenanceHistory) vehicle.maintenanceHistory = [];
  vehicle.maintenanceHistory.push({ start: vehicle.maintenanceStart, end: null, reason: reason?.trim() || null });
  saveJson(vehiclesFile, vehicles);
  res.json({ ok: true });
});

app.post("/api/admin/maintenance/end", ensureAuthenticated, ensureAdminOrSuperAdmin,
  uploadInvoice.single("invoice"), (req, res) => {
  const caller = req.session.user;
  const isSuperadmin = caller.role === "superadmin";
  const { vehicleId } = req.body;
  const vehicles = loadJson(vehiclesFile);
  const vehicle = vehicles.find(
    (v) => v.id === vehicleId && (isSuperadmin || v.company_id === caller.company_id),
  );

  if (!vehicle) return res.status(404).json({ error: "Vehículo no encontrado." });

  const states = getVehicleStates(vehicle);
  if (!states.includes("mantenimiento")) {
    return res.status(409).json({ error: "Vehículo no está en mantenimiento." });
  }

  let newStates = states.filter((s) => s !== "mantenimiento" && s !== "maintenance");
  if (newStates.length === 0) newStates = ["disponible"];
  setVehicleStates(vehicle, newStates);
  vehicle.maintenanceEnd = new Date().toISOString();
  if (!vehicle.maintenanceHistory) vehicle.maintenanceHistory = [];
  const lastEntry = vehicle.maintenanceHistory.at(-1);
  if (lastEntry && !lastEntry.end) {
    lastEntry.end = vehicle.maintenanceEnd;
    if (req.file) {
      lastEntry.invoicePath = `/uploads/invoices/${req.file.filename}`;
      lastEntry.invoiceOriginalName = req.file.originalname;
    }
  }
  saveJson(vehiclesFile, vehicles);
  res.json({ ok: true });
});

function applyMaintenanceOp(vehicle, operation) {
  const states = getVehicleStates(vehicle);
  if (operation === "start") {
    if (!states.includes("mantenimiento")) {
      const newStates = states.filter((s) => s !== "disponible" && s !== "available" && s !== "maintenance");
      newStates.push("mantenimiento");
      setVehicleStates(vehicle, newStates);
    }
    vehicle.maintenanceStart = new Date().toISOString();
    vehicle.maintenanceEnd = null;
    if (!vehicle.maintenanceHistory) vehicle.maintenanceHistory = [];
    vehicle.maintenanceHistory.push({ start: vehicle.maintenanceStart, end: null });
  } else if (operation === "end") {
    let newStates = states.filter((s) => s !== "mantenimiento" && s !== "maintenance");
    if (newStates.length === 0) newStates = ["disponible"];
    setVehicleStates(vehicle, newStates);
    vehicle.maintenanceEnd = new Date().toISOString();
    if (!vehicle.maintenanceHistory) vehicle.maintenanceHistory = [];
    const lastEntry = vehicle.maintenanceHistory.at(-1);
    if (lastEntry && !lastEntry.end) lastEntry.end = vehicle.maintenanceEnd;
  }
}

app.post("/api/admin/maintenance/bulk", ensureAuthenticated, ensureAdmin, (req, res) => {
  const { vehicleIds = [], operation } = req.body;
  const selectedIds = Array.isArray(vehicleIds) ? vehicleIds : [vehicleIds];
  const vehicles = loadJson(vehiclesFile);
  const validVehicles = vehicles.filter(
    (v) => selectedIds.includes(v.id) && v.company_id === req.session.user.company_id,
  );

  if (validVehicles.length === 0) {
    return res.status(400).json({ error: "Selecciona al menos un vehículo válido." });
  }

  for (const vehicle of validVehicles) {
    applyMaintenanceOp(vehicle, operation);
  }

  saveJson(vehiclesFile, vehicles);
  res.json({ ok: true });
});

// ── Admin — employees ────────────────────────────────────────────────────────

app.post("/api/admin/employee/add", ensureAuthenticated, ensureAdminOrSuperAdmin, (req, res) => {
  const { name, email, password, role, companyId } = req.body;
  const isSuperadmin = req.session.user.role === "superadmin";
  const targetCompanyId = isSuperadmin ? companyId : req.session.user.company_id;
  const assignedRole = role === "admin" ? "admin" : "empleado";
  const users = loadJson(usersFile);

  if (!targetCompanyId) {
    return res.status(400).json({ error: "Se requiere una empresa." });
  }

  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: "Email ya registrado." });
  }

  const newUser = {
    id: `U-${Date.now()}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: bcrypt.hashSync(password, 10),
    role: assignedRole,
    company_id: targetCompanyId,
    active: true,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveJson(usersFile, users);
  res.status(201).json({ ok: true, user: safeUser(newUser) });
});

app.post("/api/admin/employee/remove", ensureAuthenticated, ensureAdminOrSuperAdmin, (req, res) => {
  const caller = req.session.user;
  const { userId } = req.body;
  const users = loadJson(usersFile);

  const target = caller.role === "superadmin"
    ? users.find((u) => u.id === userId && u.role !== "superadmin")
    : users.find((u) => u.id === userId && u.company_id === caller.company_id && u.role === "empleado");

  if (!target) return res.status(404).json({ error: "Usuario no encontrado." });

  target.role = "sin_empresa";
  target.company_id = null;
  saveJson(usersFile, users);
  res.json({ ok: true });
});

// ── Surveys ──────────────────────────────────────────────────────────────────

app.post("/api/admin/survey/create", ensureAuthenticated, ensureAdminOrSuperAdmin, (req, res) => {
  const { vehicleId, questions } = req.body;
  const isSuperadmin = req.session.user.role === "superadmin";
  const vehicles = loadJson(vehiclesFile);
  const vehicle = vehicles.find(
    (v) => v.id === vehicleId && (isSuperadmin || v.company_id === req.session.user.company_id),
  );

  if (!vehicle) return res.status(404).json({ error: "Vehículo no encontrado." });

  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: "Debe tener al menos una pregunta." });
  }

  const surveys = loadJson(surveysFile);
  const oldSurveys = surveys.filter((s) => s.vehicleId === vehicleId);
  oldSurveys.forEach((s) => { s.active = false; });

  const newSurvey = {
    id: `S-${Date.now()}`,
    companyId: vehicle.company_id,
    vehicleId: vehicleId,
    vehicleName: vehicle.model,
    questions: questions.map((q) => ({
      id: `Q-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      text: q.text,
      type: q.type,
      required: q.required || false,
      options: q.options || null,
    })),
    createdAt: new Date().toISOString(),
    createdBy: req.session.user.id,
    active: true,
  };

  surveys.push(newSurvey);
  saveJson(surveysFile, surveys);
  res.status(201).json({ ok: true, survey: newSurvey });
});

app.get("/api/admin/surveys", ensureAuthenticated, ensureAdminOrSuperAdmin, (req, res) => {
  const surveys = loadJson(surveysFile);
  const isSuperadmin = req.session.user.role === "superadmin";
  const userSurveys = isSuperadmin
    ? surveys
    : surveys.filter((s) => s.companyId === req.session.user.company_id);
  res.json({ surveys: userSurveys });
});

app.delete("/api/admin/survey/:surveyId", ensureAuthenticated, ensureAdminOrSuperAdmin, (req, res) => {
  const { surveyId } = req.params;
  const isSuperadmin = req.session.user.role === "superadmin";
  const surveys = loadJson(surveysFile);
  const survey = surveys.find((s) => s.id === surveyId && (isSuperadmin || s.companyId === req.session.user.company_id));

  if (!survey) return res.status(404).json({ error: "Encuesta no encontrada." });

  survey.active = false;
  saveJson(surveysFile, surveys);
  res.json({ ok: true });
});

// ── Vehicle detail ───────────────────────────────────────────────────────────

app.get("/api/vehicle/:vehicleId", ensureAuthenticated, (req, res) => {
  const { vehicleId } = req.params;
  const user = req.session.user;
  const vehicles = loadJson(vehiclesFile);
  const vehicle = vehicles.find((v) => v.id === vehicleId);

  if (!vehicle) return res.status(404).json({ error: "Vehículo no encontrado." });

  if (user.role !== "superadmin" && vehicle.company_id !== user.company_id) {
    return res.status(403).json({ error: "No tienes acceso a este vehículo." });
  }

  const allTrips = loadJson(tripsFile);
  const users = loadJson(usersFile);
  const companies = loadJson(companiesFile);
  const company = companies.find((c) => c.id === vehicle.company_id);

  const allVehicleTrips = allTrips
    .filter((t) => t.vehicle_id === vehicleId)
    .sort((a, b) => new Date(b.checkoutTime) - new Date(a.checkoutTime));

  let filteredTrips = allVehicleTrips;
  if (user.role === "empleado") {
    filteredTrips = allVehicleTrips.filter(
      (t) => t.driver_id === user.id || (t.passengers || []).some((p) => p.user_id === user.id),
    );
  }

  const tripsWithDrivers = filteredTrips.map((t) => {
    const driver = users.find((u) => u.id === t.driver_id);
    return { ...t, driverName: driver?.name || "Desconocido" };
  });

  const rawActiveTrip = allTrips.find((t) => t.vehicle_id === vehicleId && t.status === "active");
  const activeTrip = rawActiveTrip
    ? {
        ...rawActiveTrip,
        driverName: users.find((u) => u.id === rawActiveTrip.driver_id)?.name || "Desconocido",
      }
    : null;

  const canManageTrip = user.role === "admin" || user.role === "superadmin" || rawActiveTrip?.driver_id === user.id;

  const companyUsers = users
    .filter((u) => u.company_id === vehicle.company_id && (u.role === "empleado" || u.role === "admin"))
    .map(safeUser);

  const surveys = loadJson(surveysFile);
  const surveyTemplate = surveys.find((s) => s.vehicleId === vehicleId && s.active);

  res.json({ vehicle, vehicleTrips: tripsWithDrivers, company, activeTrip, canManageTrip, companyUsers, surveyTemplate });
});

// ── Vehicle trips ────────────────────────────────────────────────────────────

app.post("/api/vehicle/checkout", ensureAuthenticated, ensureCompanyAdmin, (req, res) => {
  const { vehicleId, driverId, destination } = req.body;
  const isSuperadmin = req.session.user.role === "superadmin";
  const vehicles = loadJson(vehiclesFile);
  const vehicle = vehicles.find(
    (v) => v.id === vehicleId && (isSuperadmin || v.company_id === req.session.user.company_id),
  );

  if (!vehicle) return res.status(404).json({ error: "Vehículo no encontrado." });

  const companyId = isSuperadmin ? vehicle.company_id : req.session.user.company_id;
  const trips = loadJson(tripsFile);
  if (trips.some((t) => t.vehicle_id === vehicleId && t.status === "active" && t.company_id === companyId)) {
    return res.status(409).json({ error: "Este vehículo ya tiene un viaje en curso." });
  }

  let resolvedDriverId = req.session.user.id;
  if ((req.session.user.role === "admin" || isSuperadmin) && driverId) {
    const users = loadJson(usersFile);
    const driver = users.find((u) => u.id === driverId && u.company_id === companyId);
    if (!driver) return res.status(400).json({ error: "Conductor no encontrado en la empresa." });
    resolvedDriverId = driverId;
  }

  vehicle.states = vehicle.states.filter((s) => s !== "disponible" && s !== "available");
  if (!vehicle.states.includes("en_uso")) {
    vehicle.states.push("en_uso");
  }

  const departureLocation = vehicle.location;
  if (destination?.trim()) {
    vehicle.location = destination.trim();
  }
  saveJson(vehiclesFile, vehicles);

  const newTrip = {
    id: `T-${Date.now()}`,
    vehicle_id: vehicleId,
    company_id: companyId,
    driver_id: resolvedDriverId,
    destination: destination?.trim() || null,
    departureLocation,
    checkoutTime: new Date().toISOString(),
    checkinTime: null,
    returnDriver: null,
    passengers: [],
    status: "active",
  };

  trips.push(newTrip);
  saveJson(tripsFile, trips);
  res.status(201).json({ ok: true, trip: newTrip });
});

app.post("/api/vehicle/checkin", ensureAuthenticated, ensureCompanyAdmin, (req, res) => {
  const { vehicleId, returnDriver, km, survey } = req.body;
  const isSuperadmin = req.session.user.role === "superadmin";
  const vehicles = loadJson(vehiclesFile);
  const vehicle = vehicles.find(
    (v) => v.id === vehicleId && (isSuperadmin || v.company_id === req.session.user.company_id),
  );

  if (!vehicle) return res.status(404).json({ error: "Vehículo no encontrado." });

  const companyId = isSuperadmin ? vehicle.company_id : req.session.user.company_id;
  const trips = loadJson(tripsFile);
  const activeTrip = trips.find(
    (t) => t.vehicle_id === vehicleId && t.status === "active" && t.company_id === companyId,
  );

  if (!activeTrip) {
    return res.status(409).json({ error: "No hay un viaje activo para este vehículo." });
  }

  vehicle.states = vehicle.states.filter((s) => s !== "en_uso");
  if (vehicle.states.length === 0) vehicle.states = ["disponible"];

  let tripKm = km != null ? (Number.parseInt(km, 10) || 0) : null;
  activeTrip.status = "completed";
  activeTrip.checkinTime = new Date().toISOString();
  activeTrip.returnDriver = returnDriver || null;
  activeTrip.km = tripKm;
  activeTrip.survey = survey || null;

  if (survey?.templateId && survey.answers) {
    const surveys = loadJson(surveysFile);
    const template = surveys.find((s) => s.id === survey.templateId);
    if (template) {
      const kmQuestion = template.questions.find((q) => q.type === "km");
      if (kmQuestion && survey.answers[kmQuestion.id] != null) {
        const kmFromSurvey = Number.parseInt(survey.answers[kmQuestion.id], 10);
        if (!isNaN(kmFromSurvey)) {
          tripKm = kmFromSurvey;
        }
      }
    }
  }

  if (tripKm) {
    vehicle.totalKm = (vehicle.totalKm || 0) + tripKm;
  }

  if (activeTrip.departureLocation) {
    vehicle.location = activeTrip.departureLocation;
  }
  saveJson(vehiclesFile, vehicles);
  saveJson(tripsFile, trips);
  res.json({ ok: true });
});

app.post("/api/trip/add-passenger", ensureAuthenticated, ensureCompanyAdmin, (req, res) => {
  const { vehicleId, passengerName, userId } = req.body;
  const isSuperadmin = req.session.user.role === "superadmin";
  const trips = loadJson(tripsFile);
  const trip = trips.find(
    (t) => t.vehicle_id === vehicleId && t.status === "active" &&
      (isSuperadmin || t.company_id === req.session.user.company_id),
  );

  if (!trip) return res.status(404).json({ error: "Viaje activo no encontrado." });

  if (trip.driver_id !== req.session.user.id && req.session.user.role !== "admin" && !isSuperadmin) {
    return res.status(403).json({ error: "Solo el conductor o el administrador pueden añadir pasajeros." });
  }

  trip.passengers.push({
    name: passengerName.trim(),
    user_id: userId || null,
    addedAt: new Date().toISOString(),
  });
  saveJson(tripsFile, trips);
  res.json({ ok: true });
});

app.post("/api/trip/remove-passenger", ensureAuthenticated, ensureCompanyAdmin, (req, res) => {
  const { vehicleId, passengerIndex } = req.body;
  const isSuperadmin = req.session.user.role === "superadmin";
  const trips = loadJson(tripsFile);
  const trip = trips.find(
    (t) => t.vehicle_id === vehicleId && t.status === "active" &&
      (isSuperadmin || t.company_id === req.session.user.company_id),
  );

  if (!trip) return res.status(404).json({ error: "Viaje activo no encontrado." });

  if (trip.driver_id !== req.session.user.id && req.session.user.role !== "admin" && !isSuperadmin) {
    return res.status(403).json({ error: "Solo el conductor o el administrador pueden eliminar pasajeros." });
  }

  const idx = Number(passengerIndex);
  if (Number.isNaN(idx) || idx < 0 || idx >= trip.passengers.length) {
    return res.status(400).json({ error: "Índice de pasajero inválido." });
  }

  trip.passengers.splice(idx, 1);
  saveJson(tripsFile, trips);
  res.json({ ok: true });
});

// ── Superadmin ───────────────────────────────────────────────────────────────

app.post("/api/superadmin/company/delete", ensureAuthenticated, ensureSuperAdmin, (req, res) => {
  const { companyId } = req.body;
  const companies = loadJson(companiesFile);
  const company = companies.find((c) => c.id === companyId);

  if (!company) return res.status(404).json({ error: "Empresa no encontrada." });

  saveJson(companiesFile, companies.filter((c) => c.id !== companyId));

  const users = loadJson(usersFile);
  for (const u of users) {
    if (u.company_id === companyId) {
      u.role = "sin_empresa";
      u.company_id = null;
    }
  }
  saveJson(usersFile, users);

  const vehicles = loadJson(vehiclesFile);
  saveJson(vehiclesFile, vehicles.filter((v) => v.company_id !== companyId));

  const trips = loadJson(tripsFile);
  saveJson(tripsFile, trips.filter((t) => t.company_id !== companyId));

  const requests = loadJson(requestsFile);
  saveJson(requestsFile, requests.filter((r) => r.company_id !== companyId));

  res.json({ ok: true });
});

// ── Serve React in production ────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, "client", "dist")));
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "client", "dist", "index.html"));
});

// ── Start ────────────────────────────────────────────────────────────────────

app.listen(port, () => {
  console.log(`API iniciada en http://localhost:${port}`);
});
