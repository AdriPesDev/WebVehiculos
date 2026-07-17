import PropTypes from 'prop-types';
import Header from './Header';

export default function Layout({ children }) {
  return (
    <>
      <Header />
      <main className="container">
        {children}
      </main>
    </>
  );
}

Layout.propTypes = {
  children: PropTypes.node,
};
