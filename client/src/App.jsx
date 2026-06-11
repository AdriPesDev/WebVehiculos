import PropTypes from "prop-types";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import VehicleDetail from "./pages/VehicleDetail";
import CompanyCreate from "./pages/CompanyCreate";
import CompanyList from "./pages/CompanyList";
import NotFound from "./pages/NotFound";
import Kiosko from "./pages/Kiosko";
import Layout from "./components/Layout";

// ─── Pantalla de no autorizado ────────────────────────────────────────────────
function NoAutorizado({ mensaje }) {
  const location = useLocation();
  const { user } = useAuth();

  // Mensaje por defecto según el caso
  const textos = {
    sin_empresa: {
      titulo: "Necesitas una empresa",
      desc: "Esta página solo está disponible para usuarios que pertenecen a una empresa.",
      accion: { label: "Ir a mi panel", href: "/dashboard" },
    },
    con_empresa: {
      titulo: "Ya perteneces a una empresa",
      desc: "Esta página solo está disponible para usuarios que aún no tienen empresa asignada.",
      accion: { label: "Ir a mi panel", href: "/dashboard" },
    },
    solo_admin: {
      titulo: "Acceso restringido",
      desc: "Esta sección es solo para administradores de empresa.",
      accion: { label: "Volver al panel", href: "/dashboard" },
    },
  };

  const contenido = textos[mensaje] || {
    titulo: "No autorizado",
    desc: "No tienes permisos para acceder a esta página.",
    accion: { label: "Volver al inicio", href: user ? "/dashboard" : "/" },
  };

  return (
    <Layout>
      <div style={{ maxWidth: 480, margin: "6rem auto", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
        <h2 style={{ marginBottom: "0.5rem" }}>{contenido.titulo}</h2>
        <p style={{ color: "var(--muted)", marginBottom: "2rem" }}>
          {contenido.desc}
        </p>
        <a href={contenido.accion.href} className="button button-primary">
          {contenido.accion.label}
        </a>
      </div>
    </Layout>
  );
}

NoAutorizado.propTypes = {
  mensaje: PropTypes.string,
};

// ─── Rutas privadas ───────────────────────────────────────────────────────────

// Cualquier usuario autenticado
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

// Solo usuarios sin empresa (sin_empresa)
function SinEmpresaRoute({ children }) {
  const { user } = useAuth();
  if (user === undefined)
    return (
      <div className="container">
        <p>Cargando...</p>
      </div>
    );
  if (user === null) return <Navigate to="/login" replace />;
  if (user.rol !== "sin_empresa") return <NoAutorizado mensaje="con_empresa" />;
  return <>{children}</>;
}
SinEmpresaRoute.propTypes = { children: PropTypes.node.isRequired };

// Solo usuarios con empresa (admin o empleado)
function ConEmpresaRoute({ children }) {
  const { user } = useAuth();
  if (user === undefined)
    return (
      <div className="container">
        <p>Cargando...</p>
      </div>
    );
  if (user === null) return <Navigate to="/login" replace />;
  if (!["admin", "empleado", "superadmin"].includes(user.rol)) {
    return <NoAutorizado mensaje="sin_empresa" />;
  }
  return <>{children}</>;
}
ConEmpresaRoute.propTypes = { children: PropTypes.node.isRequired };

// Ruta pública: redirige al dashboard si ya hay sesión
function PublicRoute({ children }) {
  const { user } = useAuth();
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

// ─── Rutas ────────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Públicas — redirigen al dashboard si hay sesión */}
      <Route path="/" element={<Home />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* Privadas — cualquier usuario autenticado */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />

      {/* Solo usuarios con empresa */}
      <Route
        path="/vehicle/:id"
        element={
          <ConEmpresaRoute>
            <VehicleDetail />
          </ConEmpresaRoute>
        }
      />

      <Route
        path="/kiosko"
        element={
          <PrivateRoute>
            <Kiosko />
          </PrivateRoute>
        }
      />

      {/* Solo usuarios SIN empresa */}
      <Route
        path="/company/create"
        element={
          <SinEmpresaRoute>
            <CompanyCreate />
          </SinEmpresaRoute>
        }
      />
      <Route
        path="/company/list"
        element={
          <SinEmpresaRoute>
            <CompanyList />
          </SinEmpresaRoute>
        }
      />

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
