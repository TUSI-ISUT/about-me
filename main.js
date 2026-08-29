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
  initMusicPlayer();     // 背景音乐播放器
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

/* ------------------------------------------------------------
 * 10. 背景音乐播放器
 *    - 右下角悬浮唱片按钮（main.js 动态创建，无需改 HTML）
 *    - 挂在 body 上（#swup 之外）：Swup 换页不打断播放
 *    - 页面专属曲单：Minecraft 页播 music/minecraft/（随机循环），
 *      其余页面（首页/联系我）播 music/zmd/（协议流起，顺延播放）
 *    - ♫ 曲单面板：24 首全列出手动点选，选中后固定循环不再随机
 *    - Swup 换页自动切单：播放中无缝续播，暂停中仅更新待播曲目
 *    - localStorage 记忆开关；上次开着时首次任意点击自动续播
 *      （浏览器自动播放策略要求必须有一次用户手势）
 * ---------------------------------------------------------- */
function initMusicPlayer() {
  /* 曲单定义：key → { dir: 音乐子目录, tracks: 曲目数组 }
     与 music/ 下的子文件夹一一对应；增删文件后同步这里（不带 .m4a 后缀） */
  const PLAYLISTS = {
    site: {
      dir: "music/zmd/",
      tracks: [
        "协议流", // 站点默认曲：自动模式固定从这首开始，播完顺延下一首
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

  /* 每个曲单独立的播放进度与顺序：
     - mc：洗牌随机（且每次进入 MC 页随机换一首）
     - site：按定义顺序播放（协议流在最前） */
  const state = {};
  Object.keys(PLAYLISTS).forEach((key) => {
    const order =
      key === "mc" ? shuffle(PLAYLISTS[key].tracks) : [...PLAYLISTS[key].tracks];
    state[key] = { order, index: 0 };
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
  /* 音量记忆：localStorage("musicVolume")，0-100 的整数 */
  let savedVolume = 35;
  try {
    const v = parseInt(localStorage.getItem("musicVolume"), 10);
    if (v >= 0 && v <= 100) savedVolume = v;
  } catch (e) {}
  audio.volume = savedVolume / 100;
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

  /* 创建悬浮唱片按钮（挂在 body 上，Swup 换页不影响） */
  const btn = document.createElement("button");
  btn.className = "music-toggle";
  btn.type = "button";
  btn.innerHTML = '<span class="disc" aria-hidden="true"></span>';
  document.body.appendChild(btn);

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
    const tip = (playing ? "暂停音乐：" : "播放音乐：") + (manualTrack || currentTrack()) + "（滚轮调音量 " + savedVolume + "%）";
    btn.title = tip;
    btn.setAttribute("aria-label", tip);
    if (!panel.hidden) refreshPanel(); // 面板开着时同步高亮与固定标记
  }

  function play() {
    // src 与当前曲单不一致（首次播放或换页切单）时重新加载
    if (audio.getAttribute("src") !== expectedSrc()) {
      audio.src = expectedSrc();
      updateMediaSession();
    }
    audio
      .play()
      .then(() => {
        // 起播音量淡入，避免上一首的音量突变
        fadeVolume(savedVolume / 100, 600);
        updateBtn();
      })
      .catch(() => {
        /* 播放被浏览器策略拦截等情况：静默失败，按钮保持待播放态 */
        updateBtn();
      });
    updateBtn(); // 立即反馈，不等 play() 完成
  }

  function pause() {
    // 淡出到接近 0 后再真正暂停，松手时不会"啪"一声截断
    if (audio.paused) return;
    fadeVolume(0, 400, () => {
      audio.pause();
      audio.volume = savedVolume / 100; // 复位音量，下次起播直接是记忆音量
    });
    updateBtn();
  }

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

  /* 音量调节滚轮：悬停在唱片按钮上滚动即可调音量（0-100，步进 5） */
  btn.addEventListener("wheel", (e) => {
    e.preventDefault();
    savedVolume = Math.max(0, Math.min(100, savedVolume + (e.deltaY < 0 ? 5 : -5)));
    audio.volume = savedVolume / 100;
    try { localStorage.setItem("musicVolume", String(savedVolume)); } catch (err) {}
    updateBtn();
  }, { passive: false });

  btn.addEventListener("click", () => {
    if (audio.paused) {
      try { localStorage.setItem("music", "on"); } catch (e) {}
      play();
    } else {
      try { localStorage.setItem("music", "off"); } catch (e) {}
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
     - 自动模式下每次进入 Minecraft 页随机挑一首（除协议流外） */
  function syncToPage() {
    if (manualTrack) return; // 手动固定中，换页不切歌
    const key = pageToKey();
    if (key === currentKey) return;
    currentKey = key;
    if (key === "mc") {
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
    h.textContent = key === "mc" ? "Minecraft 音乐" : "站点音乐";
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
          try { localStorage.setItem("music", "on"); } catch (err) {}
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

  /* 上次开着音乐 → 首次点击页面任意处时自动续播
     （点播放器自身区域除外：那些点击交给各自的点击逻辑） */
  let savedMusic = null;
  try { savedMusic = localStorage.getItem("music"); } catch (e) {}
  if (savedMusic === "on") {
    const resume = (e) => {
      if (btn.contains(e.target) || listBtn.contains(e.target) || panel.contains(e.target)) return;
      document.removeEventListener("pointerdown", resume);
      if (audio.paused) play();
    };
    document.addEventListener("pointerdown", resume);
  }

  updateBtn(); // 初始按钮态
}
