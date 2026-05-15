# PianoTracker

**[English](README.md) · [中文](README.zh-CN.md) · [日本語](README.ja.md)**

---

面向钢琴练习者的桌面工具——连接 MIDI 键盘，记录练习，可视化进度，并向 OBS 推送实时叠加层。

> 基于 Electron + React + TypeScript 构建，SQLite 离线优先，计划开源发布。

---

## 功能介绍

### 🎹 实时 MIDI
- 自动识别 Roland FP-30（及其他 USB MIDI 设备），即插即用，无需重启
- 88 键实时键盘可视化，颜色深浅反映按键力度
- 延音踏板跟踪（区分物理按下与踏板延音）
- 实时和弦识别：根音、品质（大/小/减/增/挂留/七和弦/九和弦）、转位

### 📊 练习统计
- 每次练习及每日的按键次数、时长、使用音符数、识别和弦数
- 88 键热力图，直观呈现哪些音使用最多
- 调式分析：实时检测正在弹奏的音阶（大调、自然小调、Dorian、五声音阶、蓝调等）

### 📅 日历与计划
- 月视图日历，一眼看出哪天练习了
- 统计页面的 GitHub 风格年度热力图
- 右键任意一天可添加练习计划：设定目标时长，记录练习内容
- 今日有计划时，练习界面顶部显示横幅提醒

### 🎵 曲目管理
- 追踪正在学习的曲目，状态：未开始 / 练习中 / 已完成
- 可添加作曲家、备注，随时更新状态

### 📡 OBS 实时叠加层
- 本地 HTTP 服务 `http://localhost:7890/overlay`，在 OBS 中添加为浏览器源
- **实时 88 键钢琴**全宽渲染在叠加层底部（Canvas 绘制，SSE 实时推送，零轮询延迟）
- 可独立开关的显示元素：当前和弦、上一个和弦、练习计时、连续打卡天数、今日时长、状态指示灯
- OBS 钢琴独立键色设置（按下/延音 × 白键/黑键），支持一键从练习设置同步
- 主题：深色 / 浅色 / 极简
- 可调节位置（四角）、和弦字号、背景透明度

### ⚙️ 设置
- 和弦最低持续时长：过滤抬手时的过渡和弦，避免误识别
- RGBA 色盘自定义琴键颜色——白键/黑键、按下/延音分别设置

### 🌐 多语言
- 中文（简体）· English · 日本語

---

## 技术栈

| 层次 | 技术 |
|------|------|
| 桌面框架 | Electron 31 |
| 界面 | React 18 + TypeScript |
| 构建 | electron-vite + Vite |
| 数据库 | better-sqlite3（离线优先） |
| MIDI | Web MIDI API |
| OBS 服务 | Express 5 + SSE |
| 调色盘 | react-colorful |
| 多语言 | i18next + react-i18next |

---

## 快速开始

### 前置条件

- [Node.js](https://nodejs.org/) 18 及以上
- USB MIDI 键盘（开发与测试使用 Roland FP-30）

### 安装 & 运行

```bash
git clone https://github.com/luoyeye001/PianoTracker.git
cd PianoTracker
npm install
npm run dev
```

应用窗口会自动打开。通过 USB 连接 MIDI 键盘，即刻自动识别。

### 打包构建

```bash
# Windows 安装包（.exe）
npm run pack:win

# macOS 磁盘映像（.dmg）
npm run pack:mac
```

输出文件位于 `dist/` 目录。

---

## OBS 配置

1. 启动 PianoTracker
2. 在 OBS 中添加**浏览器**来源
3. 将 URL 设置为 `http://localhost:7890/overlay`
4. 宽高设为与画布一致（例如 1920×1080）
5. 背景色设为透明（自定义颜色 → #00000000）
6. 在应用的 **OBS** 页面自定义各显示元素

---

## 项目结构

```
src/
├── main/               # Electron 主进程
│   ├── index.ts        # 应用入口，窗口创建
│   ├── db.ts           # SQLite 结构与查询
│   ├── ipcHandlers.ts  # IPC 通道注册
│   └── obsServer.ts    # Express HTTP + SSE 服务
├── preload/
│   └── index.ts        # 安全桥接（contextBridge）
└── renderer/src/
    ├── App.tsx          # 根组件，OBS 状态推送
    ├── hooks/           # useMidi, usePracticeSession, useSettings, ...
    ├── components/      # RealtimePiano, PianoHeatmap, Sidebar, ...
    ├── pages/           # PracticePage, StatsPage, CalendarPage, ...
    ├── utils/           # 和弦识别、调式分析
    └── i18n/            # zh / en / ja 翻译文件

resources/
└── obs-overlay/
    └── index.html      # 独立 OBS 叠加层页面
```

---

## 开发路线图

### ✅ 第一期 — 核心功能（已完成）
- MIDI 连接与热插拔
- 88 键热力图
- 和弦识别
- 练习日历与年度热力图
- 曲目管理
- 多语言界面

### ✅ 第三期（部分提前）
- OBS 实时叠加层，含实时钢琴、和弦、计时器、连续打卡

### 🔲 第二期 — 深度分析
- MIDI 文件导入与可视化
- 错音/节奏分析（与参考 MIDI 比对）
- 左右手分离分析
- 数据导出（CSV / JSON）

### 🔲 第三期 — 高级功能
- Tracker Board（类 Famitracker 风格实时滚动音符轴）
- 云同步（Supabase，跨设备，支持自部署）

---

## 许可证

[MIT](LICENSE) © 桃玖
