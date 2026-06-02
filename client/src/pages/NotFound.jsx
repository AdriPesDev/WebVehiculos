import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function NotFound() {
  return (
    <Layout>
      <div style={{ textAlign: 'center', padding: '6rem 0' }}>
        <h1 style={{ fontSize: '5rem', margin: 0 }}>404</h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--muted)' }}>Página no encontrada</p>
        <Link to="/" className="button button-primary" style={{ marginTop: '2rem', display: 'inline-block' }}>
          Volver al inicio
        </Link>
      </div>
    </Layout>
  );
}
