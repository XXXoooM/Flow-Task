# FlowTask — AI 对接 / 交接文档（Project Handover）

> 本文件面向**接手本项目的 AI 助手或新工程师**，是「最短上手 + 不踩坑」的单一入口。
> 人类向的通用介绍看 `README.md`；本文件补充**只有接手时才需要的实现细节、约定与坑**。
> 最后更新：2026-09-05（对应代码版本 v1.0.0，含 UX 优化 v1.1/v1.2/v1.5 与双模式 v1.3）。

---

## 0. 30 秒速览（TL;DR）

- 是什么：**本地优先**的桌面任务管理 App（Tauri 2 + React 19 + Rust + SQLite，零网络、数据全在本地）。
- 核心心智：**双模式** —— ⚡进度模式（做什么/做到哪：列表/看板/日历）＋ 📅日程模式（何时做：24h 时间轴 + 到点提醒）。
- 关键约定（务必先读）：**没有 React Router、没有 Rust 侧 ORM/服务层**；业务状态在前端 Zustand，数据用 `tauri-plugin-sql` 直接跑参数化 SQL。
- 包管理器 **npm**（不是 pnpm）。命令见第 9 节。
- 改数据库列必须同步 3 个地方，否则撤销/备份会静默丢字段（第 8.1、第 6 节）。

---

## 1. 当前进度与待办状态（重要，接手前必读）

| 事项 | 状态 |
|:---|:---|
| 功能实现（P0–P5 + UX v1.1/v1.2/v1.5 + 双模式 Phase1–5） | ✅ 全部完成，`tsc`/`vite build`/`cargo build` 均零错 |
| GitHub 仓库 `XXXoooM/Flow-Task` `main` 分支 | ⚠️ 远端已有 `a60dc6a`（126 文件，含全部源码/文档），但**缺 `.github/workflows/` 两个文件** |
| 本地领先远端 1 个提交 | `f20c6b6 ci: 新增 GitHub Actions…`（仅新增 `ci.yml`+`release.yml`）**未推送** —— 因本机到 `github.com:443` 间歇性不可达；用户将手动上传 |
| 清理项（可选） | 两个**未被引用的孤儿文件**：`src/components/views/ScheduleList.tsx`、`src/components/layout/SettingsMenu.tsx`（早期版本遗留，现由 `TimelineView`/`SettingsPopover` 取代）。可安全删除 |
| 安全 | 交接期间用过的 Fine-grained PAT 已在对话明文出现，**应尽快在 GitHub 撤销/轮换** |

> 接手第一步建议：先 `git pull`（或等用户手动推 `f20c6b6`）让远端与工作树一致，再动手。

---

## 2. 技术栈（真实清单，非模板化理想架构）

- **桌面框架**：Tauri 2.11（crate 启用了 `tray-icon` feature）。WebView2(Win)。
- **前端**：React 19 · TypeScript ~5.8（`strict` + `noUnusedLocals/Parameters`）· Vite **6.4**（锁 v6，因目标机 Node 22.11 < Vite7 所需 22.12）。
- **样式**：Tailwind CSS 4（`@theme` 设计令牌）+ shadcn/ui（底层 Radix）。
- **状态**：Zustand 5 + `persist` 中间件（写 localStorage）。
- **动画**：Framer Motion 13。**拖拽**：@dnd-kit（core/sortable/utilities）。**虚拟列表**：@tanstack/react-virtual。
- **日历**：FullCalendar 6（daygrid/timegrid/interaction）。**命令面板**：cmdk。
- **Markdown**：react-markdown + remark-gfm + rehype-highlight（highlight.js）。
- **日期**：date-fns 4。**校验**：Zod 4。**内部 Toast**：sonner。**图标**：lucide-react。**字体**：@fontsource Inter/JetBrains Mono。
- **数据**：SQLite via `@tauri-apps/plugin-sql`（前端 `Database.load('sqlite:flowtask.db')` + `$1`/`?` 参数化 SQL）。
- **系统集成插件**：tauri-plugin-notification / -global-shortcut / -autostart / -window-state / -opener。
- **明确不使用**：React Router（视图切换靠 `uiStore.activeView`+`taskMode`）、任何 Rust 侧 ORM/Repository/Service 层、pnpm、ESLint/Prettier/Husky、Vitest/Playwright（**尚未配置**，见路线图）。

---

## 3. 目录结构（关键文件与职责）

```
src/
├── main.tsx / App.tsx                 # 入口 / 根组件
├── styles/globals.css                 # Tailwind @theme 令牌 + :root/.dark 变量 + FullCalendar/Markdown 主题
├── types/task.ts                      # TaskRow/Task/Recurrence/TagInput/TaskInput(zod)/isScheduleMode/REMINDER_OFFSETS
├── stores/                            # 见第 4 节
├── hooks/                             # useTasks / useTheme / usePomodoro
├── lib/
│   ├── db.ts                          # Database 惰性单例；失败→statusStore 记离线
│   ├── dbSnapshot.ts                  # ★ takeSnapshot/restoreSnapshot（撤销用全表快照）
│   ├── historyStore 见 stores         # recordHistory 包裹一切写操作
│   ├── dataIo.ts                      # JSON/CSV 导出 + 导入（replaceAll）
│   ├── nlParse.ts                     # 自然语言：!p0 #tag 日期 时间 !remindN → ParsedQuickAdd
│   ├── reminderEngine.ts              # computeDueReminders / isInDnd / flattenTasks（纯函数）
│   ├── dateHelpers.ts notify.ts constants.ts utils.ts
└── components/
    ├── layout/  AppShell TitleBar Sidebar StatusBar CommandPalette NotificationCenter
    │            ReminderScheduler SettingsPopover ShortcutHelp SaveIndicator
    ├── views/   MainView(路由/模式Tab) CalendarView KanbanView FocusView TimelineView SettingsView
    ├── task/    TaskItem TaskList TaskForm TaskQuickAdd SubTaskList TaskDetail
    │            TaskTagPicker TaskPrioritySelect TaskDueDatePicker RecurrencePicker
    ├── focus/   PomodoroTimer PomodoroRing FocusStats
    ├── shared/  EmptyState TagBadge
    └── ui/      shadcn/Radix 原子（button dialog popover select …）
src-tauri/
├── src/lib.rs                         # 插件注册 + 迁移注册 + setup(托盘菜单/全局快捷键) + command set_tray_title
├── migrations/001_init.sql … 004_add_schedule_mode.sql
├── capabilities/default.json          # ★ 权限白名单
└── tauri.conf.json                    # 窗口/打包；bundle.targets="all"
```

---

## 4. 状态与数据流架构

### 4.1 Store 一览（`src/stores/`）

| Store | 持久化 | 职责 |
|:---|:---|:---|
| `taskStore` | 否（DB 为源） | 任务/子任务树、CRUD、reorder、看板布局 `applyBoardLayout`、批量、重复完成顺延、`markReminded` |
| `uiStore` | ✅ localStorage | `collapsed` `activeView` `theme` `columns`(看板列) `lastPriority/lastTagIds`(智能默认) `colorblind` `taskMode` |
| `tagStore` | 否 | 标签 CRUD（8 色） |
| `focusStore` | 部分 | 番茄时长设置(persist) + `record`/`loadStats`(focus_sessions) |
| `notificationStore` | ✅ 偏好部分 | 通知分级派发(`dispatch`) + 专注/免打扰排队 + 引擎配置 |
| `notificationCenterStore` | ✅ | 提醒中心记录（未读/已读，add 去重上限 100） |
| `statusStore` | 否 | 保存状态：idle/saving/saved/error/offline |
| `historyStore` | 否（会话内） | **快照式撤销/重做**：`recordHistory(label, mutate)`、`undo()`、`redo()` |

Store 间用 `xxx.getState()` 在运行时读取；`historyStore` 通过**动态 `import()`** 刷新 task/tag store 以避免模块级循环依赖。

### 4.2 数据库 Schema（`src-tauri/migrations/`，随启动自动迁移）

```
tasks(id, parent_id, title, note_md, completed, priority, due_date,
      sort_order, view_type, kanban_col, created_at, updated_at, completed_at,
      scheduled_at, reminder_enabled, reminder_offset, last_reminded_at)
tags(id, name, color)          task_tags(task_id, tag_id)
recurrences(id, task_id UNIQUE, freq, interval, weekdays, end_date, max_count)
focus_sessions(id, task_id, started_at, ended_at, duration_s, completed)
```
- 迁移：`001` tasks/tags/task_tags · `002` recurrences · `003` focus_sessions · `004` 双模式四列 + 部分索引。
- 数据文件：Windows `%APPDATA%\com.flowtask.app\flowtask.db`（不在仓库内）。

---

## 5. 视图路由与双模式（无 Router）

- `uiStore.activeView`: `inbox | today | upcoming | calendar | kanban | focus | settings`
- `uiStore.taskMode`: `progress | schedule`
- `MainView` 的 `renderBody()` 用 `switch(activeView)` 选视图；列表类视图再按 `taskMode` 决定 `TaskList`（进度）或 `TimelineView`（日程）。
- **懒加载**：`Calendar/Kanban/Focus/Settings/Timeline` 全部 `React.lazy`（Vite 分包，减小首屏）。
- 列表 >200 条时 `TaskList` 自动切 `@tanstack/react-virtual` 虚拟化（此时拖拽仅对可见项）。

---

## 6. 提醒引擎（跨 Rust/前端，重点）

**没有 Rust 侧定时线程**（参考文档里写的 tokio 线程并不存在）。引擎在前端：

- 纯函数 `lib/reminderEngine.ts`：`computeDueReminders(tasks, now, cooldownMs)` 判定 `scheduled_at − reminder_offset ≤ now` 且 `reminder_enabled=1` 且未完成且过冷却；`isInDnd(now,...)` 处理跨零点免打扰。
- 驱动器 `components/layout/ReminderScheduler.tsx`：每 30s + 页面可见性变化触发：
  - 前台可见 → `sonner` 应用内横幅 + 可选提示音；后台/最小化 → 系统原生通知；
  - 专注中 / 免打扰时段 → 入队（`notificationStore` / `missedQueue`），结束后汇总补发；
  - 首次启动把「错过」的一次性汇总补发；
  - 所有派发**同时写入提醒中心**（未读红点）并 `taskStore.markReminded(id)` 更新 `last_reminded_at`（防重复）。
- 提醒永远需用户**显式开启**（新建日程时开关默认关）。

---

## 7. IPC 与跨组件事件（改这些前先懂约定）

- 前端 → Rust 命令：`invoke('set_tray_title', { title })`（托盘倒计时文本，`lib.rs` 里 `set_tray_title`）。
- Rust → 前端事件：全局 `Ctrl+Shift+T` 触发后 `app.emit("shortcuts://quick-add")`；`AppShell` 用 `listen(...)` 收到后 `window.dispatchEvent(new CustomEvent('flowtask:new'))`。
- **前端内部通信用 `window` CustomEvent 解耦**（跨未直接相连的组件）：
  `flowtask:new`（新建，可带 due）、`flowtask:edit`（打开编辑弹窗）、`flowtask:inline-edit`（列表键盘 Enter 内联编辑标题）、`flowtask:detail`（右侧详情抽屉，`null` 关闭）、`flowtask:show-help`（快捷键帮助）。
  → 新增交互优先复用这套事件总线，别到处传 props。

---

## 8. 关键实现约定与踩坑（务必遵守）

### 8.1 ⚠️ 改数据库列必须同步三处（否则撤销/备份静默丢字段）
新增/改 `tasks` 列时，除了 `taskStore` 的 `addTask/insertTaskRow/editTask/patchTask`，还必须同步：
1. `lib/dbSnapshot.ts`：`takeSnapshot` 的 SELECT 列清单 **和** `restoreSnapshot` 的 INSERT 列清单 + 占位符数量；
2. `lib/dataIo.ts`：备份导出（`SELECT *` 自动含）与导入 `replaceAll` 的 INSERT 列清单。
> 历史教训：漏同步会让 `Ctrl+Z` 或导入把该列数据抹掉。改完用第 11 节探针验证一次。

### 8.2 ⚠️ SQLite 写权限
`capabilities/default.json` 里 `sql:default` **不含** `sql:allow-execute`。缺它 → 所有写操作被静默拒绝（读正常，现象是「能看不能加/改」）。已显式加 `"sql:allow-execute"`。新增插件也要补其默认权限集。

### 8.3 ⚠️ 撤销是「全表快照」不是命令逆操作
`recordHistory(label, mutate)` 在 mutate 前后各取一次 4 表快照入栈（上限 50），`undo/redo` = `restoreSnapshot(before/after)`。代价是每次写多两次 `SELECT`；好处是对重复任务生成新实例、看板重排等复合写天然正确。**任何新写操作都要包在 `recordHistory` 里**（叶子操作，别嵌套调用两个会各记一次）。

### 8.4 全局快捷键写法（Tauri 2）
`on_shortcut` 不在 `Builder` 上：先 `.plugin(ShortcutBuilder::new().build())`，再在 `setup` 里 `app.global_shortcut().on_shortcut("ctrl+shift+t", |app,_s,ev|{ if ev.state()==ShortcutState::Pressed {...} })?`（需 `use GlobalShortcutExt/ShortcutState`；`app.emit` 需 `use Emitter`；`get_webview_window/tray_by_id` 需 `use Manager`）。

### 8.5 TrayIconBuilder
`.icon()` 需要 `Image`（非 `Option`）：用 `if let Some(i)=app.default_window_icon(){ tray=tray.icon(i.clone()) }`；`Image` 无 `Default`，别 `unwrap_or_default()`。

### 8.6 shadcn / tauri CLI 环境坑
- shadcn `@latest`/4.19 的 `init` 强制交互式选主题 preset、无法非交互初始化 → 用 **`npx shadcn@2.10.0 add <comp> -y`** 或直接手写组件；`add` 若目标已存在会弹 overwrite 提示（`< /dev/null` 会中止，注意）。
- 统一用 `npm run tauri dev/build`，不要直接 `npx tauri`/`cargo` 造第二套工具链。

### 8.7 其它
- **npm**（含 `package-lock.json`）；Vite 锁 v6。
- 校验只在入口（`TaskInput.safeParse`、`TagInput`），Store 内部不重复校验。
- 自然语言/日期/提醒判定都写成**纯函数**（`nlParse.ts`/`reminderEngine.ts`/`dateHelpers.ts`），便于测试与复用，不要塞进组件。

---

## 9. 开发 / 构建 / 打包

```bash
npm install
npm run tauri dev      # 开发（Vite 热重载 + Rust，自动跑迁移）
npm run build          # tsc 严格类型检查 + vite 构建
npm run tauri build    # 产安装包 → src-tauri/target/release/bundle/（MSI/NSIS 等）
npx tauri icon <png>   # 由源图重生成全套图标
cd src-tauri && cargo build && cargo clippy
```
环境要求：Node ≥20（推荐 22.x）、Rust stable、Win 需 VS2022 Build Tools + WebView2（Linux/mac 见 README）。

---

## 10. CI 与自动发版

- `.github/workflows/ci.yml`：PR/主干 push 跑 `npm run build` + `cargo fmt --check` + `cargo clippy -D warnings`。
- `.github/workflows/release.yml`：推 `v*` 标签触发 `tauri-action`，矩阵构建 win/mac(universal)/linux 并上传到 GitHub Release（默认草稿）。
- 因 `.github/workflows/*` 需 Fine-grained PAT 带 `Actions: Read and write` 才能推；本次该提交 `f20c6b6` 待手动上传。
- 本机推 GitHub 若挂：加 `-c http.version=HTTP/1.1`（HTTP/2 常被代理打断）。

---

## 11. 无头环境下的调试方法（本项目用过、有效）

无法点 GUI 时，用「临时运行时探针 + 落盘读取」验证关键路径：
1. 在 `lib.rs` 临时加 `#[tauri::command] fn save_debug(text:String){ std::fs::write(std::env::temp_dir().join("flowtask_probe.log"), text) }` 并注册；
2. 在 `main.tsx` 临时 `async` 探针：用真实 store 执行 `addTask→undo→redo`、或建到期日程跑 `computeDueReminders`/`markReminded`，把 PASS/FAIL `invoke('save_debug')`；
3. `npm run tauri dev` 后读 `%TEMP%\flowtask_probe.log`；
4. **验证完务必删除探针与命令，保持工作树干净**。
> 注意：`cargo build` 的退出码别被管道里的 `tail` 掩盖（用 `echo $?` 或读输出末尾的 `Finished`）。曾有「读能过、写失败」就是靠此法定位到 8.2。

---

## 12. 已知遗留 / 建议后续（v1.4/v1.5）

- 删除孤儿文件 `ScheduleList.tsx`、`SettingsMenu.tsx`（或用 `ScheduleList` 补一个更简单的日程列表视图，二选一）。
- 补自动化测试：Vitest + Testing Library（`nlParse`/`reminderEngine`/`historyStore` 是最该测的纯逻辑）、Playwright E2E、`cargo test`。
- 侧边栏「今日面板」聚合（时间轴 + 待办 + 进度环）；时间轴左右拖动改日期；提醒中心分组/稍后处理。
- 效率仪表盘 / 热力图 / 周报（v1.5）；移动端 / 可选加密同步（v2.0）。

---

## 13. 接手后最常见的三类改动落点

| 想做的事 | 主要落点 |
|:---|:---|
| 给任务加一个字段 | migration(新增 NNN_*.sql + `lib.rs` 注册) → `types/task.ts` → `taskStore`(addTask/insertTaskRow/editTask/patchTask/buildTree) → **`dbSnapshot`+`dataIo` 列清单(8.1)** → UI |
| 加一个视图/模式 | `constants.ts`(ViewId/NAV_ITEMS/VIEW_META) → `uiStore` → `MainView` 路由(可 lazy) |
| 加快捷键/通知 | 快捷键：`AppShell` 键盘 effect 或 `lib.rs` 全局快捷键；通知：`notificationStore.dispatch` + `ReminderScheduler` |

---

> 一句话总则：**状态在前端 Zustand、SQL 参数化直连、写操作一律走 `recordHistory`、改列记得同步快照与备份、能力权限别漏 `sql:allow-execute`、命令用 npm、Vite 锁 v6。**
> 有拿不准的先翻 `docs/ARCHITECTURE.md` 与本文件第 8 节。祝顺利 👋
