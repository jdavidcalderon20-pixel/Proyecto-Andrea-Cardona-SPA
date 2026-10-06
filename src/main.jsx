import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

try {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (error) {
  alert("FALLO CRÍTICO DE MONTAJE (main.jsx): " + error.message);
  console.error("Critical rendering error:", error);
}
