import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Layout from '../components/Layout';
import Alert from '../components/Alert';

export default function CompanyCreate() {
  const [companyName, setCompanyName] = useState('');
  const [companyCif, setCompanyCif] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('El nombre de la empresa es requerido.');
      return;
    }
    if (!companyCif.trim()) {
      setError('El CIF es requerido.');
      return;
    }
    if (!companyAddress.trim()) {
      setError('La dirección es requerida.');
      return;
    }
    if (!user?.email) {
      setError('Error: No hay sesión de usuario. Por favor inicia sesión de nuevo.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await api.companyCreate({
        nombre: companyName,
        cif: companyCif,
        direccion: companyAddress,
        email: user.email
      });
      if (res.ok) {
        if (res.user) {
          setUser(res.user);
        }
        navigate('/dashboard');
      } else {
        setError(res.error || 'Error al crear la empresa.');
      }
    } catch (err) {
      console.error('Error creating company:', err);
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
              placeholder="Ej: Transportes García S.L."
            />
          </div>
          <div className="field">
            <label htmlFor="company-cif">CIF (Código de Identificación Fiscal)</label>
            <input
              id="company-cif"
              type="text"
              value={companyCif}
              onChange={e => setCompanyCif(e.target.value)}
              placeholder="Ej: B12345678"
            />
          </div>
          <div className="field">
            <label htmlFor="company-address">Dirección</label>
            <input
              id="company-address"
              type="text"
              value={companyAddress}
              onChange={e => setCompanyAddress(e.target.value)}
              placeholder="Ej: Calle Mayor 1, Madrid"
            />
          </div>
          <button type="submit" className="button button-primary" disabled={loading || !companyName.trim() || !companyCif.trim() || !companyAddress.trim()}>
            {loading ? 'Creando...' : 'Crear empresa'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
