import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/globals.css';

// 清理旧版手动注册的 service-worker.js，避免缓存旧页面
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      if (reg.active?.scriptURL?.includes('service-worker.js')) {
        reg.unregister();
      }
    }
  });
}

// biome-ignore lint/style/noNonNullAssertion: root element is always present in index.html
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
