import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import HubApp from './apps/HubApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HubApp />
  </StrictMode>,
)

// Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('SiteVerify Hub SW registered with scope:', reg.scope);
      })
      .catch(err => {
        console.error('SiteVerify SW registration failed:', err);
      });
  });
}
