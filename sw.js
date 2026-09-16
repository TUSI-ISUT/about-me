/* ============================================================
   sw.js —— PaperClip 站点 Service Worker
   策略：
   - HTML 文档：network-first（优先拿最新版，失败回退缓存）
   - 静态资源（CSS/JS/字体/图片/音乐/库文件）：cache-first
     （内容不变或带版本号，缓存命中直接返回，离线也能看）
   - 首次访问时预缓存核心页面
   ============================================================ */

const CACHE_NAME = "paperclip-v6";

/* 首次安装时预缓存的核心资源 */
const PRECACHE_URLS = [
  "./",
  "index.html",
  "blog.html",
  "minecraft.html",
  "contact.html",
  "bbs.html",
  "404.html",
  "style.css",
  "main.js",
  "libs/marked.min.js",
  "manifest.json",
  "favicon.png",
  "00.jpg",
  "posts/index.json",
  "posts/first-post.md",
  "posts/vibe-coding.md",
  "posts/mc-server.md",
  "posts/retro-bbs.md",
];

/* 安装：预缓存核心页面 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

/* 激活：清理旧版本缓存 */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* 请求拦截 */
self.addEventListener("fetch", (event) => {
  const req = event.request;

  /* 只处理 GET 请求 */
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  /* 跨域请求（如 giscus、Cloudflare Analytics、Minecraft API）不缓存，直接放行 */
  if (url.origin !== self.location.origin) return;

  /* HTML 文档：network-first，离线时回退缓存 */
  if (req.mode === "navigate" || url.pathname.endsWith(".html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match("index.html"))
        )
    );
    return;
  }

  /* 静态资源：cache-first，未命中则请求并缓存 */
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
