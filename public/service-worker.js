// 旧版 SW 清理：此文件替换原有的 service-worker.js
// 安装后立即激活，清除所有旧缓存，然后注销自身
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((name) => caches.delete(name)))
    ).then(() => self.registration.unregister())
  );
});
