/* ============================================================
   main.js —— 全局交互脚本（所有页面共用）
   技术栈：Swup（页面切换）+ GSAP/ScrollTrigger（高级动画）
           + Lenis（平滑滚动）+ AOS（滚动触发淡入）
   模块划分：
   1. 导航栏（滚动阴影 / 汉堡菜单 / 高亮激活态）
   2. 深色/浅色模式切换（localStorage 持久化 + 跟随系统）
   3. AOS 滚动触发淡入（data-aos 属性驱动）
   4. 技能进度条入场动画（首页）
   5. 页脚年份自动更新
   6. 进度条（由 Swup 钩子驱动）
   7. Swup 页面切换（容器替换 + 进出动画 + 模块重初始化 + 脚本重放）
   8. Lenis 平滑滚动（与 ScrollTrigger 同步）
   9. GSAP 首屏动画（首页英雄区入场 + 头像视差）
   说明：所有库均为本地文件（libs/），无 CDN 依赖，可直接部署 Cloudflare Pages。
   若某库加载失败，各模块均有 window.xxx 存在性守卫，功能不中断。
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initNavbar();          // 导航栏相关
  initThemeToggle();     // 深浅色切换
  initAOS();             // 滚动触发淡入
  initSkillBars();       // 技能进度条
  initFooterYear();      // 年份
  initProgressBar();     // 创建进度条 DOM
  initSmoothScroll();    // Lenis 平滑滚动
  initSwup();            // 页面切换系统
  initHeroFx();          // GSAP 首屏动画
});

/* ------------------------------------------------------------
 * 1. 导航栏
 * ---------------------------------------------------------- */
function initNavbar() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");

  /* 1.1 页面滚动超过 10px 时给导航加底部分隔线 */
  const onScroll = () => {
    if (header) header.classList.toggle("scrolled", window.scrollY > 10);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll(); // 进入页面时先执行一次

  /* 1.2 汉堡菜单：点击切换展开/收起（≤768px 生效） */
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      toggle.classList.toggle("open");
      links.classList.toggle("open");
    });

    // 点击任意导航链接后自动收起菜单（手机端体验）
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        toggle.classList.remove("open");
        links.classList.remove("open");
      })
    );
  }

  /* 1.3 高亮当前页导航链接 */
  updateNavActive();
}

/* 1.4 重新计算导航激活态：Swup 替换内容后 URL 变化时调用 */
function updateNavActive() {
  const page = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === page);
  });
}

/* ------------------------------------------------------------
 * 2. 深色/浅色模式切换
 *    - 主题保存在 localStorage("theme")，跨页面持久化
 *    - 浅色模式 = <html> 上添加 .light 类，CSS 变量自动生效
 *    - 首次访问跟随系统 prefers-color-scheme（深色为默认）
 *    - 页面 head 中的内联脚本负责渲染前设置，避免刷新闪色
 * ---------------------------------------------------------- */
const THEME_KEY = "theme";

/* 2.1 获取当前应使用的主题 */
function getTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved; // 用户手动选过的优先
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/* 2.2 应用主题：切换 html 类 + 更新按钮图标与无障碍标签 */
function applyTheme(theme) {
  const root = document.documentElement;
  const btn = document.getElementById("theme-toggle");

  root.classList.toggle("light", theme === "light");

  if (btn) {
    // 深色模式显示"太阳"（点击切到浅色）；浅色模式显示"月亮"
    btn.textContent = theme === "light" ? "🌙" : "🌞";
    btn.setAttribute("aria-label", theme === "light" ? "切换到深色模式" : "切换到浅色模式");
  }
}

/* 2.3 初始化：同步按钮状态 + 绑定点击切换 */
function initThemeToggle() {
  const btn = document.getElementById("theme-toggle");

  applyTheme(getTheme()); // 与内联脚本的预设置保持一致（幂等，主要用于更新按钮图标）
  if (!btn) return;

  btn.addEventListener("click", () => {
    // 当前是浅色 → 切深色；否则 → 切浅色
    const next = document.documentElement.classList.contains("light") ? "dark" : "light";
    localStorage.setItem(THEME_KEY, next); // 持久化，刷新与跨页面均生效
    applyTheme(next);
  });
}

/* ------------------------------------------------------------
 * 3. AOS 滚动触发淡入：带 data-aos 属性的元素进入视口时播放动画
 *    HTML 写法：<div data-aos="fade-up"></div>
 * ---------------------------------------------------------- */
function initAOS() {
  if (!window.AOS) return; // AOS 未加载时元素仍可见（配合 html.no-js 兜底规则）

  // AOS 可用：移除 no-js 类，让 aos.css 的初始隐藏与入场动画正常生效
  document.documentElement.classList.remove("no-js");

  AOS.init({
    duration: 700,               // 动画时长
    easing: "ease-out-cubic",    // 缓动曲线
    once: true,                  // 只播放一次（与原 .reveal 行为一致）
    offset: 80,                  // 元素露出 80px 后触发
    // 用户偏好减少动态效果时直接禁用（元素立即可见）
    disable: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  });
}

/* ------------------------------------------------------------
 * 4. 技能进度条：进入视口时从 0 生长到目标宽度（首页）
 *    HTML 写法：<div class="bar-fill" data-width="85%"></div>
 * ---------------------------------------------------------- */
function initSkillBars() {
  const fills = document.querySelectorAll(".bar-fill");
  if (!fills.length) return;

  const animate = (el) => (el.style.width = el.dataset.width || "0%");

  if (!("IntersectionObserver" in window)) {
    fills.forEach(animate);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );

  fills.forEach((el) => observer.observe(el));
}

/* ------------------------------------------------------------
 * 5. 页脚年份自动更新（避免每年手动改版权信息）
 * ---------------------------------------------------------- */
function initFooterYear() {
  const yearEl = document.getElementById("footer-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

/* ------------------------------------------------------------
 * 6. 顶部进度条（NProgress 风格，由 Swup 钩子驱动）
 *    visit:start → 30%，content:replace → 70%，visit:end → 冲顶淡出
 * ---------------------------------------------------------- */
let progressEl = null;       // 进度条 DOM 元素
let progressTimer = null;    // 渐进推进定时器
let progressPercent = 0;     // 当前进度（0-100）

/* 6.1 创建进度条 DOM 并挂载到 <html>（body 会被 Swup 替换，挂根节点更稳） */
function initProgressBar() {
  if (document.getElementById("nprogress-bar")) {
    progressEl = document.getElementById("nprogress-bar");
    return;
  }
  progressEl = document.createElement("div");
  progressEl.id = "nprogress-bar";
  progressEl.setAttribute("aria-hidden", "true");
  document.documentElement.appendChild(progressEl);
}

/* 6.2 显示/推进进度条：越接近 92% 爬升越慢，保持"加载中"的感知 */
function showProgress(target) {
  if (!progressEl) return;

  progressEl.classList.remove("done");
  progressEl.style.opacity = "1";
  progressEl.style.width = Math.max(progressPercent, target) + "%";
  progressPercent = target;

  if (progressTimer) clearInterval(progressTimer);
  progressTimer = setInterval(() => {
    if (progressPercent < 92) {
      const step = (92 - progressPercent) * 0.08;
      progressPercent = Math.min(92, progressPercent + step);
      progressEl.style.width = progressPercent + "%";
    } else {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  }, 180);
}

/* 6.3 完成进度条：冲顶 100% 并淡出 */
function completeProgress() {
  if (!progressEl) return;

  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }

  progressPercent = 100;
  progressEl.classList.add("done");

  // 淡出动画结束后重置为 0，供下次跳转使用
  setTimeout(() => {
    progressEl.classList.remove("done");
    progressEl.style.width = "0%";
    progressEl.style.opacity = "0";
    progressPercent = 0;
  }, 700);
}

/* ------------------------------------------------------------
 * 7. Swup 页面切换系统
 *    - 拦截站内链接，fetch 新页面后只替换 #swup 容器（无整页刷新）
 *    - 离场/入场动画由 CSS 类驱动（见 style.css 10.1）
 *    - 内容替换后：重初始化模块 + 重放容器内脚本（如 Minecraft 查询）
 *    - fetch 失败兜底为原生跳转，功能不中断
 * ---------------------------------------------------------- */
function initSwup() {
  if (!window.Swup) return; // 库未加载 → 所有链接保持原生跳转

  const swup = new Swup({
    containers: ["#swup"],           // 仅替换 <main id="swup">
    animateHistoryBrowsing: true,    // 前进/后退按钮也播放过渡动画
  });
  window.swupInstance = swup;

  /* 7.1 访问开始：进度条 30%，随后缓慢爬升 */
  swup.hooks.on("visit:start", () => {
    showProgress(30);
    setTimeout(() => showProgress(70), 120);
  });

  /* 7.2 内容替换完成：重初始化动态模块 + 重放容器内脚本 */
  swup.hooks.on("content:replace", () => {
    updateNavActive();                       // 导航高亮跟随新页面
    initSkillBars();                         // 重新观察技能条（首页）
    initFooterYear();                        // 页脚年份（幂等）
    initHeroFx();                            // 首页英雄区 GSAP 动画（其它页自动跳过）
    if (window.AOS && window.AOS.refreshHard) AOS.refreshHard(); // 重新扫描 data-aos
    if (window.ScrollTrigger) ScrollTrigger.refresh();

    // 同步 Lenis 滚动位置（Swup 默认已 scrollTo(0)，这里对齐内部状态）
    if (window.lenisInstance) window.lenisInstance.scrollTo(0, { immediate: true });

    // 收起手机端汉堡菜单
    const toggle = document.querySelector(".nav-toggle");
    const links = document.querySelector(".nav-links");
    if (toggle && links) {
      toggle.classList.remove("open");
      links.classList.remove("open");
    }

    // 重放容器内的 <script>（如 minecraft.html 的服务器状态查询）：
    // 浏览器不会重复执行被替换插入的脚本，需重建节点强制执行
    document.querySelectorAll("#swup script").forEach((old) => {
      const fresh = document.createElement("script");
      // 复制原有属性（type / defer 等）
      for (const attr of old.attributes) fresh.setAttribute(attr.name, attr.value);
      fresh.textContent = old.textContent;
      old.replaceWith(fresh);
    });
  });

  /* 7.3 访问结束（入场动画完成）：进度条冲顶并淡出 */
  swup.hooks.on("visit:end", () => completeProgress());

  /* 7.4 获取失败兜底：直接原生跳转，功能不被阻断 */
  swup.hooks.on("fetch:error", (visit) => {
    if (visit && visit.to && visit.to.url) window.location.href = visit.to.url;
  });
}

/* ------------------------------------------------------------
 * 8. Lenis 平滑滚动：惯性滚动替代浏览器默认滚动
 * ---------------------------------------------------------- */
function initSmoothScroll() {
  if (!window.Lenis) return;
  // 用户偏好减少动态效果时不启用平滑滚动
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const lenis = new Lenis({
    autoRaf: true,       // 内部自动 requestAnimationFrame，无需手动驱动
    lerp: 0.28,          // 惯性强度（0.05 极粘 → 0.6 极跟手，默认 0.28 适中）
    duration: 1.0,       // 滚动动画最长持续秒数，防止长距离滚动拖得太慢
    smoothWheel: true,   // 鼠标滚轮走平滑
    smoothTouch: false,  // 移动端原生触摸滚动不接管（触摸跟手度 > 平滑）
  });
  window.lenisInstance = lenis;

  // 与 GSAP ScrollTrigger 同步：Lenis 滚动时通知 ScrollTrigger 更新
  if (window.ScrollTrigger) lenis.on("scroll", ScrollTrigger.update);
}

/* ------------------------------------------------------------
 * 9. GSAP 首屏动画（仅首页存在 .about-hero 时生效）
 *    - 英雄区子元素交错入场
 *    - 头像滚动视差（ScrollTrigger scrub）
 *    Swup 跳转回首页时自动重播（initHeroFx 幂等）
 * ---------------------------------------------------------- */
let heroParallaxTrigger = null; // 头像视差触发器引用（重放前需销毁）

function initHeroFx() {
  const hero = document.querySelector(".about-hero");
  if (!hero || !window.gsap) return;

  // 注册 ScrollTrigger 插件（幂等），使下方 scrollTrigger 配置生效
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  // 销毁旧的视差触发器，避免泄漏与重复
  if (heroParallaxTrigger) {
    heroParallaxTrigger.kill();
    heroParallaxTrigger = null;
  }

  // 9.1 英雄区交错入场：头像先落位，文字随后跟上
  gsap.from(hero.children, {
    opacity: 0,
    y: 26,
    duration: 0.9,
    ease: "power3.out",
    stagger: 0.12,
    delay: 0.05,
    clearProps: "all", // 动画结束清除内联样式，避免影响后续交互
  });

  // 9.2 头像滚动视差：向下滚动时头像轻微下移，产生景深感
  const avatar = hero.querySelector(".avatar");
  if (avatar && window.ScrollTrigger) {
    heroParallaxTrigger = gsap.to(avatar, {
      yPercent: 12,
      ease: "none",
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "bottom top",
        scrub: true, // 滚动进度直接映射动画进度
      },
    });
  }
}
