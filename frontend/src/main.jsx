import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App.jsx'

// Interceptar peticiones fetch relativas para soportar la URL base de producción en Vercel
const originalFetch = window.fetch;
window.fetch = function (url, options) {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  if (typeof url === 'string' && url.startsWith('/api')) {
    url = `${baseUrl}${url}`;
  }
  return originalFetch(url, options);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
