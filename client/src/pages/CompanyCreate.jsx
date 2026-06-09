import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Layout from '../components/Layout';
import Alert from '../components/Alert';

export default function CompanyCreate() {
  const [companyName, setCompanyName] = useState('');
  const [error, setError]             = useState(null);
  const [loading, setLoading]         = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.companyCreate(companyName);
      // Refresca el token para obtener el nuevo rol admin e id_empresa
      const refreshed = await api.refresh();
      if (refreshed?.usuario) setUser(refreshed.usuario);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Error al crear la empresa.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div style={{ maxWidth: 480, margin: '4rem auto' }}>
        <h2>Crear empresa</h2>
        <Alert type="error" message={error} onClose={() => setError(null)} />
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label htmlFor="company-name">Nombre de la empresa</label>
            <input
              id="company-name"
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              required
              placeholder="Ej: Transportes García S.L."
            />
          </div>
          <button type="submit" className="button button-primary" disabled={loading}>
            {loading ? 'Creando...' : 'Crear empresa'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
