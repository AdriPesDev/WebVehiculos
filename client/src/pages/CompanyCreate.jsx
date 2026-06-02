import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Layout from '../components/Layout';
import Alert from '../components/Alert';

export default function CompanyCreate() {
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await api.companyCreate(companyName, companyEmail);
    setLoading(false);
    if (res.ok) {
      setUser(res.user);
      navigate('/dashboard');
    } else {
      setError(res.error || 'Error al crear la empresa.');
    }
  }

  return (
    <Layout>
      <div style={{ maxWidth: 480, margin: '4rem auto' }}>
        <h2>Crear empresa</h2>
        <Alert type="error" message={error} onClose={() => setError(null)} />
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>Nombre de la empresa</span>
            <input
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              required
              placeholder="Ej: Transportes García S.L."
            />
          </label>
          <label>
            <span>Email de contacto</span>
            <input
              type="email"
              value={companyEmail}
              onChange={e => setCompanyEmail(e.target.value)}
              required
              placeholder="empresa@ejemplo.com"
            />
          </label>
          <button type="submit" className="button button-primary" disabled={loading}>
            {loading ? 'Creando...' : 'Crear empresa'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
