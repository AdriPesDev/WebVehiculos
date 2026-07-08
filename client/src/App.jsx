import PropTypes from "prop-types";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import VehicleDetail from "./pages/VehicleDetail";
import NotFound from "./pages/NotFound";
import Kiosko from "./pages/Kiosko";

// ─── Rutas protegidas ─────────────────────────────────────────────────────────

// Requiere sesión (SSO del portal o login local)
function PrivateRoute({ children }) {
  const { user } = useAuth();
  if (user === undefined)
    return (
      <div className="container">
        <p>Cargando...</p>
      </div>
    );
  if (user === null) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
PrivateRoute.propTypes = { children: PropTypes.node.isRequired };

// Ruta pública: redirige al dashboard si ya hay sesión
function PublicRoute({ children }) {
  const { user } = useAuth();
  const stored = JSON.parse(localStorage.getItem("usuario") || "null");
  if (stored?.email === "kiosko@nethive.es")
    return <Navigate to="/kiosko" replace />;
  if (user === undefined)
    return (
      <div className="container">
        <p>Cargando...</p>
      </div>
    );
  if (user !== null) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
PublicRoute.propTypes = { children: PropTypes.node.isRequired };

// Redirige al destino correcto según el tipo de usuario
function SmartRedirect() {
  const { user } = useAuth();
  const stored = JSON.parse(localStorage.getItem("usuario") || "null");
  if (stored?.email === "kiosko@nethive.es")
    return <Navigate to="/kiosko" replace />;
  if (user === undefined)
    return (
      <div className="container">
        <p>Cargando...</p>
      </div>
    );
  if (user === null) return <Navigate to="/login" replace />;
  return <Navigate to="/dashboard" replace />;
}

// ─── Rutas ────────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Raíz → dashboard */}
      <Route path="/" element={<SmartRedirect />} />

      {/* Login (para empleados que no entran por SSO) */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />

      {/* Detalle de vehículo */}
      <Route
        path="/vehicle/:id"
        element={
          <PrivateRoute>
            <VehicleDetail />
          </PrivateRoute>
        }
      />

      {/* Kiosko: público, gestiona su propia autenticación */}
      <Route path="/kiosko" element={<Kiosko />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
