import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Add global error handler
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

console.log('Main.tsx loaded, environment variables:', import.meta.env);

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  document.getElementById('root')!.innerHTML = `
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h1>Fehler beim Laden der Anwendung</h1>
      <p>Ein Fehler ist aufgetreten: ${error}</p>
      <p>Bitte überprüfen Sie die Browser-Konsole für weitere Details.</p>
    </div>
  `;
}
