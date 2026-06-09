import PropTypes from 'prop-types';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import VehicleDetail from './pages/VehicleDetail';
import CompanyCreate from './pages/CompanyCreate';
import CompanyList from './pages/CompanyList';
import NotFound from './pages/NotFound';

/** @param {{ children: import('react').ReactNode }} props */
function PrivateRoute(props) {
  const { children } = props;
  const { user } = useAuth();
  if (user === undefined) return <div className="container"><p>Cargando...</p></div>;
  if (user === null) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"               element={<Home />} />
      <Route path="/login"          element={<Login />} />
      <Route path="/register"       element={<Register />} />
      <Route path="/dashboard"      element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/vehicle/:id"    element={<PrivateRoute><VehicleDetail /></PrivateRoute>} />
      <Route path="/company/create" element={<PrivateRoute><CompanyCreate /></PrivateRoute>} />
      <Route path="/company/list"   element={<PrivateRoute><CompanyList /></PrivateRoute>} />
      <Route path="*"               element={<NotFound />} />
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
