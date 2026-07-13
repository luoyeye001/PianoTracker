# PianoTracker

**[English](README.md) · [中文](README.zh-CN.md) · [日本語](README.ja.md)**

---

面向钢琴练习者的桌面工具——连接 MIDI 键盘，记录练习，可视化进度，并向 OBS 推送实时叠加层。

> 基于 Electron + React + TypeScript 构建，SQLite 离线优先，计划开源发布。

---

## 应用截图

| 练习界面 | 统计界面 |
|---|---|
| ![练习界面：实时 MIDI 键盘、和弦识别、调式分析和练习控制](docs/screenshots/practice.png) | ![统计界面：练习汇总卡片、调式分析和 88 键热力图](docs/screenshots/stats.png) |

| 曲目管理 | 日历计划 |
|---|---|
| ![曲目管理界面：记录曲目、作曲家、备注和练习状态](docs/screenshots/songs.png) | ![日历界面：查看每日练习、练习计划和目标完成情况](docs/screenshots/calendar.png) |

| OBS 叠加层设置 |
|---|
| ![OBS 设置界面：浏览器源地址、显示元素、主题、位置和琴键颜色](docs/screenshots/obs.png) |

---

## 当前进度

PianoTracker 已经覆盖完整的基础练习流程：MIDI 输入、实时钢琴可视化、和弦与调式识别、练习记录、每日统计、日历计划、曲目管理，以及 OBS 直播叠加层输出。近期开发新增了更完整的练习指标、曲目关联练习、日历练习计划、OBS 钢琴独立配色，以及设置页的关于信息。

下一阶段重点是更深入的练习分析：导入参考 MIDI、对比错音与节奏、区分左右手声部，以及导出练习数据。

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
- 支持今日、本周、累计三个范围的练习汇总

### 📅 日历与计划
- 月视图日历，一眼看出哪天练习了
- 有练习记录的日期会用不同强度的颜色标记
- 右键任意一天可添加练习计划：设定目标时长，记录练习内容
- 今日有计划时，练习界面顶部显示横幅提醒

### 🎵 曲目管理
- 追踪正在学习的曲目，状态：未开始 / 练习中 / 已完成
- 可添加作曲家、备注，随时更新状态
- 练习时可关联当前曲目，便于后续统计

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
- 关于区域展示项目与许可证信息

### 🌐 多语言
- 中文（简体）· English · 日本語

---

## 技术栈

| 层次 | 技术 |
|------|------|
| 桌面框架 | Electron 39 |
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

- [Node.js](https://nodejs.org/) 20.19+ 或 22.12+
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

macOS 命令会分别生成 Intel (`x64`) 和 Apple Silicon (`arm64`) 的未签名 DMG，不需要 Apple Developer 账号。由于没有 Apple 公证，其他用户首次打开时可能需要右键 **PianoTracker.app** 选择**打开**，或在**系统设置 → 隐私与安全性**中允许打开。

练琴数据会自动保存在每位用户可写的应用数据目录，而不是 App 同级目录。macOS 数据库路径为 `~/Library/Application Support/piano-tracker/pianotracker.db`；替换或重新安装 App 不会删除该数据库。

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

### ✅ 已完成
- MIDI 热插拔识别与 88 键实时可视化
- 延音踏板跟踪、和弦识别、调式分析
- 练习会话记录：时长、按键次数、使用音符数、识别和弦数、关联曲目
- 每日汇总、统计卡片、88 键热力图、月历与练习计划
- 曲目管理：作曲家、备注、状态追踪
- OBS 浏览器源叠加层：SSE 实时更新、钢琴显示、和弦/计时/连续打卡组件、主题、位置、透明度、独立键色
- 中文、英文、日文多语言界面

### 🔲 下一步
- MIDI 文件导入与参考可视化
- 与参考 MIDI 对比错音和节奏
- 左右手分离分析
- 练习数据导出（CSV / JSON）
- Tracker Board 风格实时滚动音符轴
- 可选云同步（Supabase 或其他支持自部署的后端）

---

## 许可证

[MIT](LICENSE) © 桃玖
