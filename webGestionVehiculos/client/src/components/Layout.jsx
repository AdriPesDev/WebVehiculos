import PropTypes from 'prop-types';
import Header from './Header';
import Footer from './Footer';

export default function Layout({ children }) {
  return (
    <>
      <Header />
      <main className="container">
        {children}
      </main>
      <Footer />
    </>
  );
}

Layout.propTypes = {
  children: PropTypes.node,
};
