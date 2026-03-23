import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { activateKeepAlive } from 'even-toolkit/keep-alive';
import { App } from './App';
import './index.css';

// Prevent G2 screen timeout (~30s) with silent oscillator + Web Locks
activateKeepAlive();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
