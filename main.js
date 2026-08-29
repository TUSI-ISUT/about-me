/* ============================================================
   main.js —— 全局交互脚本（所有页面共用）
   模块划分：
   1. 导航栏（滚动阴影 / 汉堡菜单 / 高亮激活态兜底）
   2. 深色/浅色模式切换（localStorage 持久化 + 跟随系统）
   3. 滚动淡入动画（IntersectionObserver）
   4. 技能进度条入场动画（首页）
   5. 页脚年份自动更新
   6. 页面切换过渡（进度条 + View Transitions API + 兜底跳转）
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initNavbar();          // 导航栏相关
  initThemeToggle();     // 深浅色切换
  initReveal();          // 滚动淡入
  initSkillBars();       // 技能进度条
  initFooterYear();      // 年份
  initProgressBar();     // 创建进度条 DOM
  initPageTransitions(); // 页面跳转拦截 + 过渡 + 进度条驱动
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

/* ------------------------------------------------------------
 * 6. 页面切换过渡系统：进度条 + View Transitions API
 *    - 拦截同源内链点击，启动 NProgress 风格进度条
 *    - 使用 startViewTransition() 实现浏览器原生页面进出场
 *    - 不支持的浏览器降级为普通跳转，进度条依然显示
 *    - 排除：target="_blank"、download、锚点(#)、跨域链接
 * ---------------------------------------------------------- */

/** 6.1 进度条 DOM 单例与状态 */
let progressEl = null;       // 进度条 DOM 元素
let progressTimer = null;    // 渐进推进定时器
let progressPercent = 0;     // 当前进度（0-100）

/** 6.2 初始化：创建进度条 DOM 并挂载到 body，同时绑定 pageshow 收尾 */
function initProgressBar() {
  // 避免重复创建
  if (document.getElementById("nprogress-bar")) {
    progressEl = document.getElementById("nprogress-bar");
  } else {
    progressEl = document.createElement("div");
    progressEl.id = "nprogress-bar";
    progressEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(progressEl);
  }
}

/** 6.3 显示/推进进度条到指定百分比
 *  进度条会在 30%~70% 区间缓慢爬升，避免卡住不动的视觉感受 */
function showProgress(target) {
  if (!progressEl) return;

  // 重置：清除 done 类、重新显示、恢复宽度为当前已到进度
  progressEl.classList.remove("done");
  progressEl.style.opacity = "1";
  progressEl.style.width = Math.max(progressPercent, target) + "%";
  progressPercent = target;

  // 启动渐进推进：从当前进度缓慢爬到 92% 附近，保持"在加载中"的感知
  if (progressTimer) clearInterval(progressTimer);
  progressTimer = setInterval(() => {
    if (progressPercent < 92) {
      // 越接近 92%，爬升越慢
      const step = (92 - progressPercent) * 0.08;
      progressPercent = Math.min(92, progressPercent + step);
      progressEl.style.width = progressPercent + "%";
    } else {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  }, 180);
}

/** 6.4 完成进度条：立即冲顶到 100% 并淡出 */
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

/** 6.5 判断是否为需要拦截的同源内链
 *  排除：跨域、新窗口、下载、锚点(#)、mailto/tel 等协议 */
function shouldIntercept(link) {
  if (!link || !link.href) return false;
  // 同源校验（协议 + 域名 + 端口一致）
  try {
    const linkUrl = new URL(link.href, window.location.origin);
    const isSameOrigin =
      linkUrl.protocol === window.location.protocol &&
      linkUrl.host === window.location.host;
    if (!isSameOrigin) return false;
  } catch (e) {
    return false;
  }
  // 新窗口打开
  if (link.target === "_blank") return false;
  // 下载链接
  if (link.hasAttribute("download")) return false;
  // 锚点跳转（不离开当前页）
  const href = link.getAttribute("href") || "";
  if (href.startsWith("#")) return false;
  // 非 http/https 协议（mailto, tel, minecraft 等）
  if (href.startsWith("mailto:") || href.startsWith("tel:") ||
      href.startsWith("javascript:") || href.startsWith("minecraft:")) return false;
  // 中键或带修饰键点击（浏览器默认行为：新标签）
  if (window._transitionMetaKey) return false;
  return true;
}

/** 6.6 绑定点击拦截 + 过渡跳转 */
function initPageTransitions() {
  document.addEventListener("click", async (event) => {
    // 记录修饰键状态，用于 shouldIntercept 判断
    window._transitionMetaKey =
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button === 1;

    const link = event.target.closest("a");
    if (!shouldIntercept(link)) {
      window._transitionMetaKey = false;
      return;
    }
    window._transitionMetaKey = false;

    // 同一页面（hash 不同不触发，但上面已排除 # 开头）
    const url = link.href;
    if (url === window.location.href) return;

    event.preventDefault();

    // 第 1 步：点击后立刻显示进度条，前进至 30%
    showProgress(30);

    try {
      // 第 2 步：短暂延时后前进到 70%（模拟过渡动画期间的加载反馈）
      setTimeout(() => showProgress(70), 120);

      // 第 3 步：使用 View Transitions API 执行跳转
      if (typeof document.startViewTransition === "function") {
        const transition = document.startViewTransition(() => {
          // startViewTransition 回调内部执行 DOM 变更，这里使用 location.href
          // 注意：对于 MPA 跨页面，真正的过渡效果需浏览器支持 "same-origin view
          // transitions"（Chrome 126+），其他浏览器会降级但不影响跳转
          window.location.href = url;
        });
        // 等待过渡完成（若浏览器 MPA 过渡未生效，会立即 resolve）
        if (transition.finished) await transition.finished;
      } else {
        // 降级方案：直接跳转
        window.location.href = url;
      }
    } catch (e) {
      // 任何异常都兜底跳转，保证功能不被阻断
      window.location.href = url;
    }
  });

  /** 6.7 新页面加载完成后收尾进度条
   *  pageshow 比 load 更早触发，且在 bfcache（往返缓存）恢复时也会触发 */
  window.addEventListener("pageshow", () => {
    completeProgress();
  });

  // 兜底：load 事件再执行一次，防止 pageshow 场景遗漏
  window.addEventListener("load", () => {
    completeProgress();
  });

  // 兼容：点击"返回/前进"按钮（popstate）后也收尾
  window.addEventListener("popstate", () => {
    completeProgress();
  });
}
