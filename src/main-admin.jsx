import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthProvider } from './contexts/AuthContext.jsx'
import AdminApp from './apps/AdminApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AdminApp />
    </AuthProvider>
  </StrictMode>,
)

// Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('SiteVerify Admin SW registered with scope:', reg.scope);
      })
      .catch(err => {
        console.error('SiteVerify SW registration failed:', err);
      });
  });
}
