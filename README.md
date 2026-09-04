<p align="center">
  <img src="./assets/logo.svg" alt="FlowTask Logo" width="120" />
</p>

<h1 align="center">FlowTask</h1>

<p align="center">
  <strong>本地优先 · 零云端依赖 · 高性能桌面任务管理</strong>
</p>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-blue" />
  <img alt="Tauri" src="https://img.shields.io/badge/Tauri-2.x-orange" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61dafb" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178c6" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green" />
  <img alt="Platform" src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" />
</p>

<p align="center">
  <a href="#-快速开始">快速开始</a> ·
  <a href="#-功能特性">功能特性</a> ·
  <a href="#-技术栈">技术栈</a> ·
  <a href="#-架构设计">架构设计</a> ·
  <a href="#-数据模型">数据模型</a> ·
  <a href="#-开发指南">开发指南</a> ·
  <a href="#-路线图">路线图</a>
</p>

---

## 📖 项目简介

FlowTask 是一款**纯本地运行**的桌面任务管理应用，基于 **Tauri 2 + React 19 + Rust** 构建。所有数据存储于本地 SQLite，**无需联网、无需注册、无需云服务**，数据完全属于用户。安装包仅约 5–6 MB，冷启动 < 1 秒。

它的核心是「**双模式**」心智模型：**⚡ 进度模式**关注「做什么 / 做到哪了」，**📅 日程模式**关注「什么时候做」；同一任务可同时拥有两种属性，并在两个视图间自由切换。

### 设计原则

```
本地优先     零网络依赖，数据不出本机
极速响应     原生 WebView2 + Rust 后端，冷启动 < 1s，安装包 < 15MB
渐进式复杂度 简单场景零配置，高级功能按需展开（内联编辑 → 详情抽屉 → 命令面板）
键盘友好     全键盘导航 + 自然语言快添，双手不离键盘
安静不打扰   通知分级、专注排队、免打扰时段
```

---

## ✨ 功能特性

| 功能 | 说明 |
|:---|:---|
| 📋 任务管理 | 创建/编辑/删除/完成，子任务（嵌套）、多标签、优先级 P0–P3、备注 Markdown |
| 📅 双模式 | 进度模式（列表/看板/日历）+ 日程模式（24h 时间轴），顶部 Tab 切换、各自记忆 |
| 🕐 提醒引擎 | 日程到点提醒，**默认关闭**需显式开启；提前量可配、5 分钟冷却、错过补发、专注/免打扰排队 |
| 🔔 提醒中心 | 标题栏铃铛 + 未读红点，错过的提醒集中回看、一键已读/清空 |
| 📊 三视图 | 列表 / 日历（月·周，拖拽改期）/ 看板（自定义列 + 跨列拖拽） |
| 🍅 专注 | 可配置番茄钟（工作/短/长休息）、SVG 环形进度、提示音、日/周专注统计 |
| 🔁 重复任务 | 每天/每周/每月重复；完成时自动顺延生成下一次实例 |
| 🔍 命令面板 | `Ctrl + K` 搜索任务 / 切换视图 / 快捷操作 |
| ✍️ 自然语言快添 | `写周报 !p0 #工作 明天下午3点 !remind15` 一行创建，实时预览 |
| ↩️ 撤销/重做 | `Ctrl+Z` / `Ctrl+Shift+Z`，快照式覆盖所有写操作 |
| 🌗 主题 | 亮色 / 暗色 / 跟随系统，CSS 变量驱动 |
| ♿ 无障碍 | 键盘全覆盖、色盲友好模式（颜色之外叠加文字/形状） |
| 💾 数据安全 | SQLite 本地存储；JSON 备份 / CSV 导出、导入（可撤销） |
| 🖥 系统集成 | 系统托盘（倒计时/显示隐藏/退出）、全局快捷键、开机自启 |

### 双模式对比

| 维度 | ⚡ 进度模式（默认） | 📅 日程模式 |
|:---|:---|:---|
| 核心语义 | 做什么 / 做到哪了 | 什么时候做 |
| 时间字段 | 截止日期（可选，无时刻） | 精确时间点 `scheduled_at` |
| 提醒 | 到期高亮，无到点强提醒 | ✅ 到点提醒（手动开启） |
| 排序 | 优先级 → 创建时间 | 时间线正序 |
| 视图 | 列表 / 看板 / 日历 | 24h 时间轴 |
| 场景 | 开发任务、阅读、里程碑 | 会议、面试、航班、预约、服药 |

---

## 🛠 技术栈

> 本项目采用「**前端 Zustand 承担业务状态 + 通过 `tauri-plugin-sql` 直接执行参数化 SQL**」的轻量架构，Rust 侧保持精简（插件注册、系统托盘、全局快捷键、开机自启、数据库迁移）。**未使用后端 ORM，也未使用 React Router**（视图切换由状态驱动）。

```
FlowTask 技术栈
│
├── 桌面框架 ── Tauri 2.11 (Rust)
│   ├── WebView ── 系统原生 (WebView2 / WKWebView / WebKitGTK)
│   ├── IPC ───── invoke + event (listen)
│   └── 打包 ──── tauri-bundler (MSI / NSIS · DMG · AppImage/deb)
│
├── 前端 ─────── React 19 + TypeScript 5.8
│   ├── 构建 ───── Vite 6（重型视图 React.lazy 分包）
│   ├── 状态 ───── Zustand 5（persist 中间件）
│   ├── 样式 ───── Tailwind CSS 4（@theme 设计令牌 + shadcn/ui · Radix）
│   ├── 动画 ───── Framer Motion 13
│   ├── 拖拽 ───── @dnd-kit（core/sortable/utilities）+ 虚拟列表 @tanstack/react-virtual
│   ├── 日历 ───── FullCalendar 6（daygrid/timegrid/interaction）
│   ├── 命令面板 ── cmdk
│   ├── 富文本 ─── react-markdown + remark-gfm + rehype-highlight
│   ├── 表单校验 ── Zod 4
│   ├── 通知(内) ── Sonner
│   └── 图标/字体 ─ Lucide + @fontsource (Inter / JetBrains Mono)
│
├── 数据层 ───── SQLite（tauri-plugin-sql，$1 / ? 参数化查询）
│   ├── 迁移 ───── 版本化 SQL（001–004）随 Database.load 自动执行
│   └── 一致性 ─── 快照式撤销栈覆盖 tasks/tags/recurrences 全字段
│
├── 系统集成 ─── Tauri Plugins
│   ├── tauri-plugin-sql(sqlite) · notification · global-shortcut
│   └── autostart · window-state · opener
│
└── 工具链 ──── TypeScript 严格模式 + Vite；CI/CD 见 .github/workflows
```

### 关键依赖版本

| 依赖 | 版本 | 用途 |
|:---|:---|:---|
| `@tauri-apps/api` / `@tauri-apps/cli` | ^2 | 桌面框架与 CLI |
| `tauri`（crate，feature `tray-icon`） | 2.11 | Rust 核心 |
| `tauri-plugin-sql`（sqlite） | 2.4 | 数据库 |
| `tauri-plugin-notification` / `-global-shortcut` / `-autostart` / `-window-state` | 2.x | 系统集成 |
| `react` / `react-dom` | ^19.1 | UI 框架 |
| `typescript` | ~5.8 | 类型系统 |
| `vite` | ^6.4 | 构建（因 Node 22.11 锁 v6，未用 v7） |
| `tailwindcss` / `@tailwindcss/vite` | ^4.3 | 样式 |
| `zustand` | ^5.0 | 状态 |
| `framer-motion` | ^13.2 | 动画 |
| `@dnd-kit/*` | 6 / 10 | 拖拽 |
| `@fullcalendar/*` | ^6.1 | 日历 |
| `cmdk` | ^1.1 | 命令面板 |
| `react-markdown` / `remark-gfm` / `rehype-highlight` / `highlight.js` | ^10 / 4 / 7 / 11 | Markdown 渲染 |
| `zod` | ^4.5 | 运行时校验 |
| `date-fns` | ^4.4 | 日期 |

---

## 🏗 架构设计

```
┌──────────────────────────────────────────────────────────┐
│  表现层  React 19 · Tailwind v4 · Framer Motion           │
│  TitleBar / Sidebar / MainView(路由) / 各视图与任务组件     │
├──────────────────────────────────────────────────────────┤
│  状态层  Zustand stores                                    │
│  taskStore · uiStore · tagStore · focusStore              │
│  notificationStore · notificationCenterStore              │
│  statusStore · historyStore(快照式撤销)                    │
├──────────────────────────────────────────────────────────┤
│  领域/工具 lib                                             │
│  db(SQLite 连接) · dataIo(导入导出) · nlParse(自然语言)     │
│  reminderEngine(到期/冷却/免打扰判定) · dateHelpers · notify │
├──────────────────────────────────────────────────────────┤
│  Tauri 桥接  invoke(set_tray_title) · listen(事件)         │
│  tauri-plugin-sql 直连 SQLite（参数化 SQL）                │
├──────────────────────────────────────────────────────────┤
│  Rust 后端（精简）                                         │
│  插件注册 · 系统托盘菜单 · 全局快捷键(Ctrl+Shift+T)        │
│  · 开机自启 · 窗口状态 · 版本化迁移(001–004)               │
├──────────────────────────────────────────────────────────┤
│  存储  SQLite 本地文件  %APPDATA%/com.flowtask.app/…db    │
│       + WebView localStorage（偏好/看板列/主题/历史栈）    │
└──────────────────────────────────────────────────────────┘
```

所有写操作统一经 `historyStore.recordHistory(label, mutate)`：写前/写后各取一次 SQLite 快照入栈，使撤销/重做对任何表变更（含重复任务生成的新实例）都成立。完整分层与 IPC 约定见 **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)**。

### 前端目录结构（节选）

```
src/
├── main.tsx / App.tsx
├── components/
│   ├── layout/    AppShell · TitleBar · Sidebar · StatusBar
│   │              CommandPalette · NotificationCenter · ReminderScheduler
│   │              SettingsPopover · ShortcutHelp · SaveIndicator
│   ├── task/      TaskItem(内联编辑) · TaskForm · TaskList(虚拟列表) · SubTaskList
│   │              TaskTagPicker · TaskPrioritySelect · TaskDueDatePicker
│   │              RecurrencePicker · TaskQuickAdd · TaskDetail
│   ├── views/     CalendarView · KanbanView · FocusView · TimelineView · SettingsView
│   ├── focus/     PomodoroTimer · PomodoroRing · FocusStats
│   ├── shared/    EmptyState · TagBadge
│   └── ui/        button · dialog · dropdown-menu · popover · select · …（shadcn/Radix）
├── stores/        taskStore · uiStore · tagStore · focusStore
│                  notificationStore · notificationCenterStore · statusStore · historyStore
├── hooks/         useTasks · useTheme · usePomodoro
├── lib/           db · dbSnapshot · dataIo · nlParse · reminderEngine
│                  dateHelpers · notify · constants · utils
├── types/         task.ts
└── styles/        globals.css（Tailwind @theme 令牌 + FullCalendar/Markdown 主题）
```

---

## 📦 快速开始

### 环境要求

| 依赖 | 最低版本 | 说明 |
|:---|:---|:---|
| [Node.js](https://nodejs.org) | ≥ 20（推荐 22.x；Vite7 需 ≥22.12，本项目锁 Vite6 无此限制） | 前端构建 |
| [Rust](https://rustup.rs) | stable（实测 1.97 可用） | Tauri 后端 |
| Windows | VS 2022 Build Tools（C++ 工作负载）+ WebView2 | 开发/打包 |
| macOS | Xcode Command Line Tools | — |
| Linux | `libwebkit2gtk-4.1-dev` `libgtk-3-dev` `libayatana-appindicator3-dev` | — |

> 本项目统一使用 **npm**（含 `package-lock.json`）。

### 安装与运行

```bash
# 1. 克隆
git clone https://github.com/XXXoooM/Flow-Task.git
cd Flow-Task

# 2. 安装依赖
npm install

# 3. 开发（Vite 热重载 + Rust 编译，自动执行数据库迁移）
npm run tauri dev

# 4. 生产构建（输出安装包到 src-tauri/target/release/bundle/）
npm run tauri build
```

### 常用脚本

| 命令 | 说明 |
|:---|:---|
| `npm run dev` | 仅启动 Vite 前端（无 Tauri 壳） |
| `npm run build` | 前端类型检查（`tsc`）+ 生产构建 |
| `npm run tauri dev` | 完整开发模式 |
| `npm run tauri build` | 生产打包（MSI + NSIS 等） |
| `npx tauri icon <png>` | 由源图重新生成全套应用图标 |
| `cargo build` / `cargo clippy` | 在 `src-tauri/` 下编译 / 静态分析 Rust |

---

## 🗄 数据模型

四张表 + 版本化迁移（`src-tauri/migrations/`），随应用启动自动升级到最新 Schema。

```
tasks ──1:N── tasks (parent_id 自关联 = 子任务)
  ├──N:M── task_tags ──N:1── tags
  └──1:1── recurrences（重复规则）
focus_sessions（番茄专注记录，task_id 可空）
```

### `tasks` 表

| 字段 | 类型 | 约束 | 说明 |
|:---|:---|:---|:---|
| `id` | TEXT | PK | UUID |
| `parent_id` | TEXT | FK→tasks, ON DELETE CASCADE | 子任务父级 |
| `title` | TEXT | NOT NULL | 标题 |
| `note_md` | TEXT | DEFAULT '' | Markdown 备注 |
| `completed` | INTEGER | DEFAULT 0 | 0/1 |
| `priority` | INTEGER | DEFAULT 3 | 0 紧急 / 1 高 / 2 中 / 3 低 |
| `due_date` | TEXT | NULL | 截止日期（进度模式） |
| `sort_order` | REAL | DEFAULT 0 | 手动排序权重 |
| `view_type` | TEXT | DEFAULT 'list' | 归属视图标记 |
| `kanban_col` | TEXT | NULL | 看板列 id |
| `created_at`/`updated_at` | TEXT | NOT NULL | 本地时间 |
| `completed_at` | TEXT | NULL | 完成时间 |
| `scheduled_at` | TEXT | NULL | 精确时间（日程模式，ISO 到分） |
| `reminder_enabled` | INTEGER | DEFAULT 0 | 是否到点提醒（需显式开启） |
| `reminder_offset` | INTEGER | DEFAULT 900 | 提前量（秒） |
| `last_reminded_at` | TEXT | NULL | 冷却：上次提醒时间 |

> 迁移：`001` 建 tasks/tags/task_tags · `002` recurrences · `003` focus_sessions · `004` 双模式四列 + 部分索引。

**数据位置**：Windows `%APPDATA%\com.flowtask.app\flowtask.db`。备份/迁移请用「设置 → 数据 → 导出 JSON」。

---

## 🔔 提醒系统

```
scheduled_at − reminder_offset ≤ now, 且 reminder_enabled=1 且未完成
   ├─ 距上次提醒 < 冷却期(默认 5min)?  → 跳过（防重复）
   ├─ 免打扰时段 / 专注中?            → 入队，结束后汇总补发
   ├─ 前台?  应用内横幅 + 可选提示音
   ├─ 后台?  系统原生通知
   └─ 全部落「提醒中心」，错过的启动时补发并标未读
```

| 配置 | 默认值 | 说明 |
|:---|:---|:---|
| 全局提醒开关 | ON | 一键暂停 |
| 默认提前量 | 15 min | 新建日程预设 |
| 免打扰时段 | 22:00–08:00 | 静默入队 |
| 重复提醒间隔 | 5 min | 同一任务最小间隔 |

---

## ⌨️ 快捷键速查

| 快捷键 | 功能 |
|:---|:---|
| `Ctrl + K` | 命令面板 |
| `Ctrl + Shift + T` | 全局快速新建（后台亦可，唤起窗口） |
| `Ctrl + N` | 新建任务 |
| `Ctrl + Z` / `Ctrl + Shift + Z`（或 `Ctrl+Y`） | 撤销 / 重做 |
| `Ctrl + 1 / 2 / 3` | 切换 列表 / 日历 / 看板 |
| `↑` / `↓` · `Enter` / `Space` / `Delete` | 列表导航 · 编辑 / 完成 / 删除 |
| `Esc` · `?` | 关闭弹窗 / 快捷键帮助 |

---

## 🧪 质量与测试

当前质量保障：`tsc` 严格模式、Vite 构建、`cargo build`/`clippy`。**自动化测试（Vitest / Testing Library / Playwright / cargo test）尚未配置**，已列入路线图 v1.5。开发期采用「构建 + 运行时探针」验证关键路径（数据库写入、提醒到期与冷却、迁移列一致性）。

---

## 🗺 路线图

| 版本 | 主题 | 状态 |
|:---|:---|:---|
| v1.0 | 核心：CRUD/SQLite、三视图、番茄钟、标签、命令面板、设置、导入导出、打包 | ✅ 已完成 |
| v1.1 | 内联编辑、自然语言、撤销/重做、智能默认值、上下文快捷操作 | ✅ 已完成 |
| v1.2 | 全键盘、通知分级、状态可见性、空状态引导、拖拽容错 | ✅ 已完成 |
| v1.3 | 双模式：日程模式、提醒引擎、24h 时间轴、提醒中心、日程自然语言语法 | ✅ 已完成 |
| v1.5 | 自动化测试、效率仪表盘、热力图、周报 | 📋 规划中 |
| v2.0 | 移动端、浏览器扩展、可选端到端加密同步 | 📋 规划中 |

详见 **[docs/ROADMAP.md](./docs/ROADMAP.md)**。

---

## 🚀 发布（GitHub Actions）

推送以 `v` 开头的 tag 即触发自动构建三平台安装包并发布到 GitHub Release：

```bash
git tag v1.0.0 && git push origin v1.0.0
```

详见 [.github/workflows/release.yml](./.github/workflows/release.yml)。

## 🤝 贡献

请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。简述：`Fork → feature/* 分支 → 编码 → Conventional Commit → PR → Review → Merge`。

## 📄 许可证

[MIT License](./LICENSE)

---

<p align="center"><sub>Built with ❤️ 和 ☕ · 数据永远属于你</sub></p>
