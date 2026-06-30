import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.tsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the service worker for PWA functionality — but only in a real
// production deployment. On localhost the dev server serves UN-hashed bundles
// (e.g. /static/js/bundle.js) that the SW's cache-first strategy would pin,
// which is what made a long-removed "intro shuffle" keep replaying on
// localhost. So we keep the worker off there; public/sw.js also self-unregisters
// on localhost to clean up any worker a past production build left behind.
const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production' && !isLocalhost) {
  // Was a service worker already controlling this page when it loaded? If so, a
  // later controllerchange means a NEW worker took over (an update) — reload once
  // so the page picks up the fresh assets. On a first-ever install there's no
  // prior controller, so we skip that gratuitous reload.
  const hadController = !!navigator.serviceWorker.controller;
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing || !hadController) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
} else if ('serviceWorker' in navigator) {
  // Dev / localhost: proactively tear down any stale worker and its caches so
  // `npm start` always serves fresh code. (Registering the new sw.js above isn't
  // possible here, but the browser's update check still picks it up and it
  // self-unregisters; this is a belt-and-suspenders cleanup.)
  navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
  if (window.caches) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
}

// Add to home screen prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  
  // Show install button (can be implemented in UI later)
  console.log('App can be installed');
});

// Handle app installation
window.addEventListener('appinstalled', (evt) => {
  console.log('App was installed');
});