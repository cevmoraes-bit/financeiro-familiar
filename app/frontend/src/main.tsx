import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prerendered blog pages are served as pure static HTML for SEO.
// Intentionally skip React mounting so the crawler-facing markup stays
// lightweight and self-contained — no client-side hydration needed.
const isPrerenderedBlogPage =
  document
    .querySelector('meta[name="prerender-static-page"]')
    ?.getAttribute('content') === 'blog';

if (!isPrerenderedBlogPage) {
  createRoot(document.getElementById('root')!).render(<App />);
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });

  // When a new service worker takes over (a new deploy was published),
  // reload once so the tab picks up the new app shell instead of staying
  // on stale JS from before the update.
  let hasReloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hasReloaded) return;
    hasReloaded = true;
    window.location.reload();
  });
}
