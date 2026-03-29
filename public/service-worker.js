// 过渡用 SW：替换旧版缓存优先策略
// 1. 安装后立即激活（跳过等待）
// 2. 清除所有旧缓存
// 3. 注销自身，让 vite-plugin-pwa 的 sw.js 接管
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((name) => caches.delete(name)))
    ).then(() => self.clients.claim())
     .then(() => self.registration.unregister())
  );
});
