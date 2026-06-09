import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Layout from '../components/Layout';
import Alert from '../components/Alert';

export default function CompanyList() {
  const [companies, setCompanies] = useState([]);
  const [flash, setFlash]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.companyList()
      .then(res => {
        if (Array.isArray(res)) {
          setCompanies(res.map(c => ({
            id:   c.id_empresa,
            name: c.nombre,
          })));
        }
      })
      .catch(() => setFlash({ type: 'error', message: 'Error al cargar las empresas.' }))
      .finally(() => setLoading(false));
  }, []);

  async function handleJoin(id_empresa) {
    try {
      await api.companyJoin(id_empresa);
      setFlash({ type: 'success', message: 'Solicitud enviada. Espera la aprobación del administrador.' });
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setFlash({ type: 'error', message: err.message || 'Error al enviar la solicitud.' });
    }
  }

  return (
    <Layout>
      <section className="dashboard">
        <div className="dashboard-header">
          <h2>Empresas disponibles</h2>
          <p>Solicita unirte a una empresa</p>
        </div>

        {flash && <Alert type={flash.type} message={flash.message} onClose={() => setFlash(null)} />}
        {loading && <p>Cargando empresas...</p>}
        {!loading && companies.length === 0 && <p>No hay empresas registradas todavía.</p>}
        {!loading && companies.length > 0 && (
          <div className="table-section">
            <table>
              <thead>
                <tr><th>Empresa</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {companies.map(c => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>
                      <button className="button button-small button-primary" onClick={() => handleJoin(c.id)}>
                        Solicitar unirse
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Layout>
  );
}
