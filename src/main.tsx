import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { reconcilePwaServiceWorker } from './services/pwaServiceWorker'

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to Sentry or similar service
  }
});

reconcilePwaServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
