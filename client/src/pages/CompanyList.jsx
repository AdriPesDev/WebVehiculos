import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Layout from '../components/Layout';
import Alert from '../components/Alert';

export default function CompanyList() {
  const [companies, setCompanies] = useState([]);
  const [flash, setFlash] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.companyList()
      .then(res => {
        if (res.error) setFlash({ type: 'error', message: res.error });
        else setCompanies(res.companies);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleJoin(companyId) {
    const res = await api.companyJoin(companyId);
    if (res.ok) {
      setFlash({ type: 'success', message: 'Solicitud enviada. Espera la aprobación del administrador.' });
      setTimeout(() => navigate('/dashboard'), 2000);
    } else {
      setFlash({ type: 'error', message: res.error });
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

        {(() => {
          if (loading) return <p>Cargando empresas...</p>;
          if (companies.length === 0) return <p>No hay empresas registradas.</p>;

          return (
            <div className="table-section">
              <table>
                <thead>
                  <tr>
                    <th>Empresa</th><th>Email</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map(c => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.email}</td>
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
          );
        })()}
      </section>
    </Layout>
  );
}
