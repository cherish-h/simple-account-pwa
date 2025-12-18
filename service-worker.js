// 缓存名称和版本
const CACHE_NAME = 'kadian-cache-v1';

// 需要缓存的资源列表
const CACHE_ASSETS = [
  './index.html',
  './manifest.json',
  './service-worker.js',
  './icon.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// 安装事件：缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('缓存资源中...');
        return cache.addAll(CACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活事件：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('清理旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

//  fetch事件：优先使用缓存，同步更新新资源
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 如果缓存中有资源，返回缓存资源，并异步更新缓存
        if (response) {
          // 异步更新缓存
          fetch(event.request)
            .then((newResponse) => {
              if (newResponse && newResponse.status === 200 && newResponse.type === 'basic') {
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, newResponse.clone());
                  });
              }
            })
            .catch(() => {
              // 更新失败不影响使用缓存
            });
          return response;
        }
        
        // 如果缓存中没有资源，直接请求网络
        return fetch(event.request)
          .then((response) => {
            // 检查响应是否有效
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 克隆响应，因为响应流只能使用一次
            const responseToCache = response.clone();
            
            // 将新资源加入缓存
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          });
      })
      .catch(() => {
        // 如果网络请求失败，返回默认页面（仅针对HTML请求）
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});