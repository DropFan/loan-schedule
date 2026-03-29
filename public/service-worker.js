// 过渡用 SW：替换旧版缓存优先策略
// 1. 安装后立即激活（跳过等待）
// 2. 清除所有旧缓存
// 3. fetch 事件走网络优先，缓存失败时返回网络响应
// 4. 不注销自身 — 让 vite-plugin-pwa 的 sw.js 在下次加载时自然接管
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((name) => caches.delete(name)))
    ).then(() => self.clients.claim())
  );
});

// 网络优先：确保用户拿到最新页面，不再返回旧缓存
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
