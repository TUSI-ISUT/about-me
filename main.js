/* ============================================================
   main.js —— 全局交互脚本（所有页面共用）
   模块划分：
   1. 导航栏（滚动阴影 / 汉堡菜单 / 高亮激活态兜底）
   2. 深色/浅色模式切换（localStorage 持久化 + 跟随系统）
   3. 滚动淡入动画（IntersectionObserver）
   4. 技能进度条入场动画（首页）
   5. 页脚年份自动更新
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initNavbar();        // 导航栏相关
  initThemeToggle();   // 深浅色切换
  initReveal();        // 滚动淡入
  initSkillBars();     // 技能进度条
  initFooterYear();    // 年份
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

  /* 1.3 激活态兜底：若某个页面忘记写 .active，
     则按当前文件名自动匹配导航链接并高亮 */
  const page = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-link").forEach((link) => {
    const target = link.getAttribute("href");
    if (target && target === page && !link.classList.contains("active")) {
      link.classList.add("active");
    }
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
 * 3. 滚动淡入动画：带 .reveal 的元素进入视口时淡入上移
 * ---------------------------------------------------------- */
function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;

  // 不支持 IntersectionObserver 时直接显示，保证内容可见
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in-view"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target); // 只播放一次，节省性能
        }
      });
    },
    { threshold: 0.12 } // 元素露出 12% 时触发
  );

  items.forEach((el) => observer.observe(el));
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
