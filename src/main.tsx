import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/globals.css';

// 清理旧版 service-worker.js：触发更新让其拉取过渡版本（网络优先 + 清缓存）
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      if (reg.active?.scriptURL?.includes('service-worker.js')) {
        reg.update();
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
