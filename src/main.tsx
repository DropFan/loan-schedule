import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/globals.css';

// 清理旧版 sw.js 注册：vite-plugin-pwa 已改用 service-worker.js 输出
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      if (reg.active?.scriptURL?.endsWith('/sw.js')) {
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
