import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'

const savedTheme = localStorage.getItem('theme');
document.documentElement.dataset.theme =
  savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
