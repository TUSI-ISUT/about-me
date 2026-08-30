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
   10. 背景音乐播放器（页面专属曲单 + 曲单面板手动点选固定循环）
   说明：所有库均为本地文件（libs/），无 CDN 依赖，可直接部署 Cloudflare Pages。
   若某库加载失败，各模块均有 window.xxx 存在性守卫，功能不中断。
   ============================================================ */

/* 站点版本号：发版时只改这里，页脚自动同步显示 */
const SITE_VERSION = "v0.2.5";

document.addEventListener("DOMContentLoaded", () => {
  initNavbar();          // 导航栏相关
  initThemeToggle();     // 深浅色切换
  initTimeline();        // 首页"我的轨迹"折叠（必须在 initAOS 之前：折叠会移动布局，
                         // 否则 AOS 会缓存折叠前的元素位置，技能区永远不触发入场动画）
  initAOS();             // 滚动触发淡入
  initSkillBars();       // 技能进度条
  initFooterYear();      // 年份
  initVersion();         // 页脚版本号
  initProgressBar();     // 创建进度条 DOM
  initSmoothScroll();    // Lenis 平滑滚动
  initSwup();            // 页面切换系统
  initHeroFx();          // GSAP 首屏动画
  initMusicPlayer();     // 背景音乐播放器
  initGiscusShield();    // 留言板滚轮屏蔽层（依赖 Lenis，需在其后执行）
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
      const open = links.classList.toggle("open");
      toggle.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open)); // 无障碍：告知菜单展开状态
    });

    // 点击任意导航链接后自动收起菜单（手机端体验）
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        toggle.classList.remove("open");
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
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

/* 2.2 应用主题：切换 html 类 + 更新按钮图标与无障碍标签
   切换瞬间给 html 挂 .theme-anim，让全站颜色平滑过渡而非闪变 */
function applyTheme(theme) {
  const root = document.documentElement;
  const btn = document.getElementById("theme-toggle");

  root.classList.add("theme-anim");
  clearTimeout(applyTheme._timer);
  applyTheme._timer = setTimeout(() => root.classList.remove("theme-anim"), 450);

  root.classList.toggle("light", theme === "light");

  // giscus 留言板已在页面上时，同步切换它的主题
  const giscusFrame = document.querySelector("iframe.giscus-frame");
  if (giscusFrame && giscusFrame.contentWindow) {
    try {
      giscusFrame.contentWindow.postMessage(
        { giscus: { setConfig: { theme: theme === "light" ? "light" : "dark" } } },
        "https://giscus.app"
      );
    } catch (e) {}
  }

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

  /* 部分嵌入式浏览器把页面标记为后台时会冻结 AOS 的 IntersectionObserver，
     导致 data-aos 元素一直停留在透明态；页面转为可见时重新扫描补播 */
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && window.AOS) AOS.refresh();
  });

  /* 字体/图片在 DOMContentLoaded 之后才加载完成，会再次移动布局；
     这些时机各重测一次位置，避免 AOS 用旧位置漏判"元素已进入视口" */
  window.addEventListener("load", function () {
    if (window.AOS) AOS.refresh();
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      if (window.AOS) AOS.refresh();
    });
  }
}

/* ------------------------------------------------------------
 * 3.5 留言板滚轮屏蔽层（contact 页）
 *     giscus 是跨域 iframe：鼠标悬停其上时滚轮事件派发给 iframe
 *     内部，Lenis 完全收不到；而 giscus iframe 自适应内容高度、
 *     自身不可滚动，滚轮要么被吞掉要么触发浏览器原生瞬时滚动，
 *     与 Lenis 的平滑滚动打架，表现为卡顿。
 *     解法：盖一层透明屏蔽，让滚轮落在页面上由 Lenis 接管；
 *     点击屏蔽层后可正常操作留言板，鼠标移出自动恢复。
 *     触摸设备无此问题（不启用）；Lenis 未启用时也无需屏蔽。
 * ---------------------------------------------------------- */
function initGiscusShield() {
  const box = document.querySelector(".giscus-box");
  if (!box || !window.lenisInstance) return;

  // 幂等：Swup 换页重放时不重复创建
  if (box.querySelector(".giscus-shield")) return;

  const shield = document.createElement("div");
  shield.className = "giscus-shield";
  shield.title = "点击后可操作留言板";
  box.appendChild(shield);

  // 点击 → 解除屏蔽，可点击/输入/滚动留言板内部
  shield.addEventListener("click", () => shield.classList.add("off"));
  // 鼠标移出留言板区域 → 恢复屏蔽，滚轮重新由页面平滑接管
  box.addEventListener("mouseleave", () => shield.classList.remove("off"));
}

/* ------------------------------------------------------------
 * 4. 技能进度条：进入视口时从 0 生长到目标宽度（首页）
 *    HTML 写法：<div class="bar-fill" data-width="85%"></div>
 *    兼容性：部分嵌入式浏览器（webview）会把页面标记为后台并
 *    冻结 IntersectionObserver 回调，导致进度条永远为 0。
 *    因此在 IO 之外叠加一层手动几何检测兜底（滚动/可见性变化时
 *    逐个检查），保证任何环境下进度条都能显示。
 * ---------------------------------------------------------- */
function initSkillBars() {
  const fills = Array.from(
    document.querySelectorAll(".bar-fill")
  ).filter((el) => !el.style.width);
  if (!fills.length) return;

  const animate = (el) => (el.style.width = el.dataset.width || "0%");

  /* 手动兜底：直接按几何位置判断，视口内即填充 */
  const checkManually = () => {
    const vh = window.innerHeight;
    let remaining = false;
    fills.forEach((el) => {
      /* Swup 换页后旧元素已脱离 DOM：视为完成，不再阻塞解除监听 */
      if (!el.isConnected || el.style.width) return;
      if (el.getBoundingClientRect().top < vh * 0.9) {
        animate(el);
      } else {
        remaining = true;
      }
    });
    /* 全部填完后撤掉兜底监听 */
    if (!remaining) {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onScroll);
      if (observer) observer.disconnect();
    }
  };
  const onScroll = () => requestAnimationFrame(checkManually);

  if (!("IntersectionObserver" in window)) {
    fills.forEach(animate);
    return;
  }

  let observer = new IntersectionObserver(
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

  /* 立即手动检查一次，再挂滚动/可见性兜底（与 IO 双保险） */
  checkManually();
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", onScroll);
}

/* ------------------------------------------------------------
 * 4.5 "我的轨迹"时间轴折叠：默认只显示前两条，其余折叠，
 *     点"展开全部/收起"切换（仅首页存在 .timeline 时生效）
 * ---------------------------------------------------------- */
function initTimeline() {
  const timeline = document.querySelector(".timeline");
  const toggleBtn = document.querySelector(".tl-toggle");
  if (!timeline || !toggleBtn) return;

  // 第 3 条起标记为可折叠项；每次初始化（含 Swup 换页重放）都恢复默认折叠
  timeline.querySelectorAll(".tl-item").forEach((el, i) => {
    el.classList.toggle("tl-extra", i >= 2);
  });
  timeline.classList.add("collapsed");

  const sync = () => {
    const collapsed = timeline.classList.contains("collapsed");
    toggleBtn.textContent = collapsed ? "展开全部 ▾" : "收起 ▴";
    toggleBtn.setAttribute("aria-expanded", String(!collapsed));
  };
  sync();

  toggleBtn.onclick = () => {
    timeline.classList.toggle("collapsed");
    sync();
  };
}

/* ------------------------------------------------------------
 * 5. 页脚年份自动更新（避免每年手动改版权信息）
 * ---------------------------------------------------------- */
function initFooterYear() {
  const yearEl = document.getElementById("footer-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

/* 5.1 页脚版本号：填充所有 .site-version（与顶部 SITE_VERSION 单一来源） */
function initVersion() {
  document.querySelectorAll(".site-version").forEach((el) => {
    el.textContent = SITE_VERSION;
  });
  console.log(`PaperClip ${SITE_VERSION}`);
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
    initTimeline();                          // 时间轴折叠（首页，幂等）
    initFooterYear();                        // 页脚年份（幂等）
    initHeroFx();                            // 首页英雄区 GSAP 动画（其它页自动跳过）
    initGiscusShield();                      // 留言板滚轮屏蔽层（contact 页，幂等）
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
      toggle.setAttribute("aria-expanded", "false");
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

/* ------------------------------------------------------------
 * 10. 背景音乐播放器
 *    - 右下角悬浮唱片按钮（main.js 动态创建，无需改 HTML）
 *    - 挂在 body 上（#swup 之外）：Swup 换页不打断播放
 *    - 页面专属曲单：Minecraft 页播 music/minecraft/，
 *      其余页面（首页/联系我）播 music/zmd/（终末地音乐）
 *    - ♫ 曲单面板：全列出手动点选，选中后固定循环不再随机
 *    - Swup 换页自动切单：播放中无缝续播，暂停中仅更新待播曲目
 *    - 打开页面自动随机播放；被浏览器自动播放策略拦截时
 *      首次任意点击自动续播
 * ---------------------------------------------------------- */
function initMusicPlayer() {
  /* 曲单定义：key → { dir: 音乐子目录, tracks: 曲目数组 }
     与 music/ 下的子文件夹一一对应；增删文件后同步这里（不带 .m4a 后缀） */
  const PLAYLISTS = {
    site: {
      dir: "music/zmd/",
      tracks: [
        // 明日方舟：终末地 音乐，随机循环播放
        "万里升平",
        "不周风",
        "大潮升",
        "孤案灯青",
        "寻暇日",
        "山樆轻",
        "戏彩绳",
        "新壤",
        "方兴",
        "春景故人来",
        "来时新社",
        "烘炉",
        "穆如清风",
        "观陵水",
        "青简注我",
      ],
    },
    mc: {
      dir: "music/minecraft/",
      tracks: [
        "Cat",
        "Chirp",
        "Creator(八音盒)",
        "Creator",
        "Lava Chicken",
        "Mall",
        "O's Piano",
        "Wait",
      ],
    },
  };

  /* 每个曲单独立的播放进度与顺序：均洗牌随机，
     打开页面即从随机位置开始，播完自动下一曲（循环整个曲单） */
  const state = {};
  Object.keys(PLAYLISTS).forEach((key) => {
    state[key] = { order: shuffle(PLAYLISTS[key].tracks), index: 0 };
  });

  /* Fisher-Yates 洗牌：每首歌等概率出现在任意位置
     （sort(() => Math.random() - 0.5) 的分布有偏差，弃用） */
  function shuffle(list) {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* 当前页面所属曲单：Minecraft 页 → mc，其余 → site */
  function pageToKey() {
    const page = location.pathname.split("/").pop() || "index.html";
    return page === "minecraft.html" ? "mc" : "site";
  }
  let currentKey = pageToKey();

  /* 手动点选状态：用户在曲单面板选中的曲目名
     非空时固定循环该曲目，页面切换与随机逻辑全部让位 */
  let manualTrack = null;

  const audio = new Audio();
  const VOLUME = 0.15; // 固定音量：背景音乐，音量压低不抢页面内容（已移除音量调节）
  audio.volume = VOLUME;
  audio.preload = "metadata"; // 预载时长等元信息：点播时能更快起播，流量开销极小

  /* 音量淡入/淡出：换歌、播放、暂停时平滑过渡，避免爆音与突兀感 */
  let fadeRaf = null;
  function fadeVolume(to, duration, done) {
    if (fadeRaf) cancelAnimationFrame(fadeRaf);
    fadeRaf = null;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      audio.volume = to;
      if (done) done();
      return;
    }
    const from = audio.volume;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      audio.volume = from + (to - from) * t;
      if (t < 1) {
        fadeRaf = requestAnimationFrame(step);
      } else {
        fadeRaf = null;
        if (done) done();
      }
    };
    fadeRaf = requestAnimationFrame(step);
  }

  /* 创建悬浮胶囊播放器（挂在 body 上，Swup 换页不影响）：
     [小唱片] 曲名 [▶/‖] —— 点击整条切换播放/暂停 */
  const btn = document.createElement("button");
  btn.className = "music-toggle";
  btn.type = "button";
  btn.innerHTML =
    '<span class="disc" aria-hidden="true"></span>' +
    '<span class="m-title"></span>' +
    '<span class="m-state" aria-hidden="true">' +
      '<img class="ic-play" src="icon-play.png" alt="" />' +
      '<img class="ic-pause" src="icon-pause.webp" alt="" />' +
    '</span>';
  document.body.appendChild(btn);
  const mTitle = btn.querySelector(".m-title");
  btn.setAttribute("aria-live", "polite"); // 换歌时屏幕阅读器播报新曲名

  function currentTrack() {
    const s = state[currentKey];
    return s.order[s.index];
  }

  /* 按曲目名反查所属子目录（手动点选的曲目可能来自任一曲单） */
  function trackDir(name) {
    for (const key of Object.keys(PLAYLISTS)) {
      if (PLAYLISTS[key].tracks.includes(name)) return PLAYLISTS[key].dir;
    }
    return "music/";
  }

  /* 当前应当播放的 src：手动点选优先，否则跟随页面曲单
     （与 audio 的属性值比较用相对路径，避开绝对 URL 差异） */
  function expectedSrc() {
    const name = manualTrack || currentTrack();
    return trackDir(name) + encodeURIComponent(name) + ".m4a";
  }

  function updateBtn() {
    const playing = !audio.paused;
    btn.classList.toggle("playing", playing);
    mTitle.textContent = manualTrack || currentTrack();
    const tip = (playing ? "暂停音乐：" : "播放音乐：") + mTitle.textContent;
    btn.title = tip;
    btn.setAttribute("aria-label", tip);
    if (!panel.hidden) refreshPanel(); // 面板开着时同步高亮与固定标记
  }

  /* ---- 播放进度记忆：localStorage("musicState")，按曲单记录上次曲目与时间点 ---- */
  const STATE_KEY = "musicState";

  function savePosition() {
    if (manualTrack || !audio.src || audio.ended) return;
    const t = audio.currentTime;
    if (!t) return;
    try {
      const all = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
      all[currentKey] = { track: currentTrack(), time: t };
      localStorage.setItem(STATE_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  /* 恢复某曲单的上次曲目到 state.index，并把需 seek 的时间写入
     pendingSeek（无记录返回 0），由换源后的 applyPendingSeek() 统一应用 */
  function restoreIndex(key) {
    let s;
    try { s = JSON.parse(localStorage.getItem(STATE_KEY) || "{}")[key]; } catch (e) {}
    if (!s || !s.track) return 0;
    const st = state[key];
    const i = st.order.indexOf(s.track);
    if (i === -1) return 0;
    st.index = i;
    const t = s.time > 5 ? s.time : 0; // 快开头就从头播
    pendingSeek = t;
    return t;
  }

  /* 节流保存：timeupdate 高频触发，每 5 秒落一次盘；暂停/切后台/关页前立即保存 */
  let lastSave = 0;
  audio.addEventListener("timeupdate", () => {
    const now = Date.now();
    if (now - lastSave > 5000) {
      lastSave = now;
      savePosition();
    }
  });
  audio.addEventListener("pause", savePosition);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) savePosition();
  });
  window.addEventListener("pagehide", savePosition);

  /* 待恢复的播放进度（秒）：restoreIndex() 设置，play() 换源后应用 */
  let pendingSeek = 0;

  function play() {
    // src 与当前曲单不一致（首次播放或换页切单）时重新加载
    if (audio.getAttribute("src") !== expectedSrc()) {
      audio.src = expectedSrc();
      updateMediaSession();
      applyPendingSeek(); // 恢复上次播放到的时间点（元数据就绪后再 seek）
    }
    audio
      .play()
      .then(() => {
        // 起播音量淡入，避免上一首的音量突变
        fadeVolume(VOLUME, 600);
        updateBtn();
      })
      .catch(() => {
        /* 播放被浏览器策略拦截等情况：静默失败，按钮保持待播放态 */
        updateBtn();
      });
    updateBtn(); // 立即反馈，不等 play() 完成
  }

  function pause() {
    // 界面立即响应：图标/唱片马上切换，声音在后台 400ms 淡出，
    // 操作零延迟感（淡出完成后 audio.pause() 会触发事件同步状态）
    if (audio.paused) return;
    btn.classList.remove("playing");
    fadeVolume(0, 400, () => {
      audio.pause();
      audio.volume = VOLUME; // 复位音量，下次起播直接是固定音量
    });
  }

  /* 图标/唱片跟随 audio 真实状态：淡入淡出会延迟真正的 play/pause，
     不能只靠 play()/pause() 里的手动 updateBtn()（暂停时序对不上） */
  audio.addEventListener("play", updateBtn);
  audio.addEventListener("pause", updateBtn);

  /* 播放失败自动跳下一首：文件缺失/解码失败时不至于静默卡住。
     连续失败达到曲单长度时停止尝试（曲单可能整体不可用）。 */
  let errorStreak = 0;
  audio.addEventListener("error", () => {
    const s = state[currentKey];
    if (manualTrack || ++errorStreak >= s.order.length) {
      errorStreak = 0;
      return;
    }
    s.index = (s.index + 1) % s.order.length;
    play();
  });
  audio.addEventListener("playing", () => (errorStreak = 0));

  /* 预加载下一曲：当前曲目起播后，把曲单里的下一首拉进缓存，
     切歌时浏览器直接命中缓存，不再等网络 */
  let preloadedKey = null;
  const preloaded = new Audio();
  preloaded.preload = "auto";
  function preloadNext() {
    const s = state[currentKey];
    const next = s.order[(s.index + 1) % s.order.length];
    const url = PLAYLISTS[currentKey].dir + encodeURIComponent(next) + ".m4a";
    if (preloadedKey !== url) {
      preloaded.src = url;
      preloadedKey = url;
    }
  }
  audio.addEventListener("playing", preloadNext);

  /* 系统媒体会话：锁屏/媒体键/系统面板显示曲名，并支持硬件播放控制 */
  function updateMediaSession() {
    if (!("mediaSession" in navigator)) return;
    const name = manualTrack || currentTrack();
    navigator.mediaSession.metadata = new MediaMetadata({
      title: name,
      artist: "站点背景音乐",
      album: currentKey === "mc" ? "Minecraft" : "zmd",
    });
    try {
      navigator.mediaSession.setActionHandler("play", () => play());
      navigator.mediaSession.setActionHandler("pause", () => pause());
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        if (manualTrack) return; // 固定循环模式不响应切歌
        const s = state[currentKey];
        s.index = (s.index + 1) % s.order.length;
        play();
      });
    } catch (e) {}
  }

  btn.addEventListener("click", () => {
    if (audio.paused) {
      play();
    } else {
      pause();
    }
  });

  /* 一曲播完：手动点选 → 循环同一首；自动模式 → 当前曲单下一首 */
  audio.addEventListener("ended", () => {
    if (manualTrack) {
      play(); // 固定曲目循环
      return;
    }
    const s = state[currentKey];
    s.index = (s.index + 1) % s.order.length;
    play();
  });

  /* Swup 换页时同步曲单：Minecraft 页 ↔ 其它页
     - 手动点选模式：固定曲目不随页面变化
     - 播放中：无缝续播；暂停中：仅更新按钮提示
     - 进入 Minecraft 页时随机换一首；回到其它页继续终末地曲单 */
  function syncToPage() {
    if (manualTrack) return; // 手动固定中，换页不切歌
    const key = pageToKey();
    if (key === currentKey) return;
    currentKey = key;
    // 有历史记录则恢复上次曲目与进度；没有则随机起一首（仅 MC 曲单）
    if (!restoreIndex(key) && key === "mc") {
      const s = state.mc;
      s.index = Math.floor(Math.random() * s.order.length); // 随机换一首
    }
    if (audio.paused) {
      updateBtn();
    } else {
      play();
    }
  }
  if (window.swupInstance) {
    window.swupInstance.hooks.on("content:replace", syncToPage);
  }

  /* ---- 10.8 曲单面板：手动点选曲目（点选后固定循环，不再随机） ---- */
  const listBtn = document.createElement("button");
  listBtn.className = "music-list-btn";
  listBtn.type = "button";
  listBtn.textContent = "♫";
  listBtn.title = "选择曲目";
  listBtn.setAttribute("aria-label", "选择曲目");
  document.body.appendChild(listBtn);

  const panel = document.createElement("div");
  panel.className = "music-panel";
  panel.hidden = true;
  panel.setAttribute("data-lenis-prevent", ""); // 面板内滚动不透传给 Lenis
  document.body.appendChild(panel);

  /* 按曲单分组生成曲目行（--i 为级联入场序号，配合 style.css 11.3 动画） */
  let seq = 0;
  Object.keys(PLAYLISTS).forEach((key) => {
    const h = document.createElement("h4");
    h.textContent = key === "mc" ? "Minecraft 音乐" : "终末地音乐";
    h.style.setProperty("--i", seq++);
    panel.appendChild(h);

    PLAYLISTS[key].tracks.forEach((name) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "track";
      row.dataset.track = name;
      row.innerHTML = '<span class="tname"></span><span class="pin-tip" hidden>循环</span>';
      row.querySelector(".tname").textContent = name;
      row.style.setProperty("--i", seq++);
      panel.appendChild(row);

      row.addEventListener("click", (e) => {
        e.stopPropagation();
        if (manualTrack === name) {
          // 再点一次已固定曲目：取消固定，恢复页面自动曲单
          manualTrack = null;
          if (!audio.paused) {
            play(); // 播放中 → 无缝切回当前页自动曲目
          } else {
            updateBtn();
          }
        } else {
          // 固定该曲目循环播放，随机/换页逻辑全部让位
          manualTrack = name;
          play();
        }
        refreshPanel();
      });
    });
  });

  /* 刷新面板行状态：正在播放高亮 + 固定循环标记 */
  function refreshPanel() {
    const now = manualTrack || currentTrack();
    panel.querySelectorAll(".track").forEach((row) => {
      const name = row.dataset.track;
      row.classList.toggle("active", name === now && !audio.paused);
      row.querySelector(".pin-tip").hidden = name !== manualTrack;
    });
  }

  /* 面板开合：点♫按钮切换；点面板以外区域收起 */
  /* 收起：先播放缩小淡出动画，动画结束后再真正隐藏
     （prefers-reduced-motion 下动画被禁用，用定时器兜底隐藏） */
  function closePanel() {
    if (panel.hidden || panel.classList.contains("closing")) return;
    panel.classList.add("closing");
    let finished = false;
    panel.addEventListener("animationend", function onEnd(e) {
      if (e.target !== panel) return; // 忽略子元素的动画结束事件
      panel.removeEventListener("animationend", onEnd);
      finished = true;
      panel.classList.remove("closing");
      panel.hidden = true;
    });
    setTimeout(() => {
      if (finished) return;
      panel.classList.remove("closing");
      panel.hidden = true;
    }, 230);
  }

  listBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (panel.hidden) {
      panel.hidden = false;
      refreshPanel();
    } else {
      closePanel();
    }
  });

  panel.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", (e) => {
    if (panel.hidden) return;
    if (panel.contains(e.target) || listBtn.contains(e.target)) return;
    closePanel();
  });

  /* Esc 关闭曲单面板（无障碍：键盘用户不用找别的出口） */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) closePanel();
  });

  /* 打开页面即自动随机播放：
     - 浏览器允许时（有媒体互动记录）直接起播
     - 被自动播放策略拦截时，等待首次任意点击/触摸续播 */
  /* 待恢复进度换源后统一在此应用（play() 与 tryAutoplay 共用） */
  function applyPendingSeek() {
    if (pendingSeek <= 0) return;
    const seekTo = pendingSeek;
    pendingSeek = 0;
    if (audio.readyState >= 1) {
      audio.currentTime = seekTo;
    } else {
      audio.addEventListener(
        "loadedmetadata",
        () => (audio.currentTime = seekTo),
        { once: true }
      );
    }
  }

  function tryAutoplay() {
    restoreIndex(currentKey);      // 恢复上次听到的曲目与进度
    audio.src = expectedSrc();     // 必须先设音源再 play（这里不走 play() 包装）
    updateMediaSession();
    applyPendingSeek();
    audio
      .play()
      .then(() => {
        fadeVolume(VOLUME, 600);
        updateBtn();
      })
      .catch(() => {
        const resume = () => {
          document.removeEventListener("pointerdown", resume);
          if (audio.paused) play();
        };
        document.addEventListener("pointerdown", resume);
      });
  }
  tryAutoplay();

  updateBtn(); // 初始按钮态
}
