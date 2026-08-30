# PaperClip · 个人主页

一名在校学生的个人小站：折腾网页、玩 Minecraft、听终末地的歌。
99% Vibe Coding + 1% 人工，部署在 Cloudflare Pages 上。

**在线访问**：<https://hell0.dpdns.org>

## 站点组成

| 页面 | 说明 |
|------|------|
| `index.html` | 现代模式主页：我的轨迹、技能进度条、复古 BBS 入口 |
| `bbs.html` | **复古 DOS 终端**（本站最有意思的部分，见下） |
| `minecraft.html` | Minecraft 服务器实时状态 + 交流群 |
| `contact.html` | 联系方式 + giscus 留言板（附学业回复提示） |

## 复古 DOS 终端（bbs.html）

开机自检 → UCDOS 中文平台 → `C:\>` 提示符，一台 1997 年的 486：

- **BBS.COM** —— 拨号上站（WebAudio 合成拨号音/握手声），呼号登录后可逛：
  站长档案 / 我的轨迹 / 技能档案 / 布告栏 / 留言板（与 giscus 同仓同步）/
  在线用户（随机） / 系统时间 / MC 服务器实时状态
- **PORTAL.EXE** —— 光圈科技终端：GLaDOS 口吻全流程，
  `status / cores / cake / glados / cave / history / products / borealis`，
  `play` 还会播放 `music/Never Gonna Give You Up.mid`（自带迷你 MIDI 解析器 + WebAudio 合成）
- **SNAKE.EXE** —— 贪吃蛇（方向键/WASD，Q 退出）
- **官方风味命令**：`dir / cd / type / tree / color / edit / mem / chkdsk /
  scandisk（动画）/ defrag（动画）/ ping / ver / vol / echo / cls / exit`，
  TAB 补全，配色可切换（绿磷 / 琥珀 / 蓝白）
- 留言板草稿存 localStorage，公开留言走 GitHub 登录（contact 页 giscus）

## 技术栈

- 纯静态 HTML / CSS / JavaScript，**无框架、无构建步骤**
- 本地库（`libs/`）：Swup（无刷新换页）、GSAP + ScrollTrigger、Lenis（平滑滚动）、AOS（滚动入场）
- 终端音效与音乐全部由 WebAudio 现场合成或本地文件，无 CDN 依赖
- `main.js` 顶部 `SITE_VERSION` 为全站版本号单一来源（页脚 / BBS 自动同步）

## 本地运行

```bash
python -m http.server 8123
# 打开 http://127.0.0.1:8123
```

> 直接双击 HTML（file://）也能看，但 BBS 的留言同步、MIDI 播放等功能需要 http 环境。

## 部署

Cloudflare Pages，Git 集成自动部署。`_headers` 内置缓存策略：
HTML / main.js / style.css 每次回源校验（杜绝新旧混用），
音乐、字体、库文件长缓存。

## 联系方式

- Email: mc_yyds@qq.com
- GitHub: <https://github.com/TUSI-ISUT>
- B站: [Paper_Clip_zero](https://space.bilibili.com/3546855067617665)
- 站点: <https://hell0.dpdns.org>

---

当前版本 **v0.2.5** · © 2026 PaperClip · 保留所有权利
