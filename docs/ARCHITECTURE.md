# FlowTask 架构设计文档

> 本文描述**实际实现**的架构。与常见的「胖后端」不同，FlowTask 刻意把业务逻辑放在前端 Zustand，Rust 侧保持精简。

## 1. 分层总览

| 层 | 技术 | 职责 |
|:---|:---|:---|
| 表现层 | React 19 + Tailwind v4 + Framer Motion | 渲染与交互、视图与组件 |
| 状态层 | Zustand 5（persist） | 全局状态、筛选/视图/主题、撤销栈 |
| 领域/工具 | `lib/*` | 数据访问、快照、自然语言、提醒引擎、日期、通知 |
| 桥接层 | Tauri IPC（`invoke` / `listen`）+ `tauri-plugin-sql` | 前后端通信、直连 SQLite |
| 系统集成 | Tauri 插件 + Rust `setup` | 托盘、全局快捷键、开机自启、窗口状态 |
| 存储层 | SQLite 本地文件 + WebView localStorage | 持久化 |

## 2. 状态管理（stores）

```
taskStore               任务/子任务树、CRUD、排序、看板布局、批量、重复生成
uiStore                 侧栏折叠、activeView、主题、看板列、taskMode、色盲、智能默认
tagStore                标签 CRUD
focusStore              番茄时长设置(persist) + 会话记录/统计
notificationStore       通知分级偏好 + 专注/免打扰排队 + 派发
notificationCenterStore 提醒中心记录(未读/已读, persist)
statusStore             保存状态: idle/saving/saved/error/offline
historyStore            快照式命令栈, recordHistory()/undo()/redo()
```

Store 之间以 Zustand `getState()` 在运行时读取，避免模块级循环依赖（`historyStore` 通过动态 `import()` 刷新 task/tag store）。

## 3. 数据访问与迁移

- 连接：`lib/db.ts` 惰性单例 `Database.load('sqlite:flowtask.db')`；首次加载即触发 Rust 端注册的迁移。
- 迁移：`src-tauri/migrations/NNN_*.sql`，在 `lib.rs` 的 `migrations()` 中以 `version` 递增注册，`tauri-plugin-sql` 内部 `/_sqlx_migrations` 追踪已执行版本，只增不改。
- 查询：一律参数化（`$1`/`?`），SQL 直接写在 store/lib 中（Repository 语义下沉到 `taskStore`/`tagStore` 的函数）。

### 表

```
tasks(id, parent_id, title, note_md, completed, priority, due_date,
      sort_order, view_type, kanban_col, created_at, updated_at, completed_at,
      scheduled_at, reminder_enabled, reminder_offset, last_reminded_at)
tags(id, name, color)
task_tags(task_id, tag_id)
recurrences(id, task_id UNIQUE, freq, interval, weekdays, end_date, max_count)
focus_sessions(id, task_id, started_at, ended_at, duration_s, completed)
```

> ⚠️ 约定：**任何新增列都必须同步** `lib/dbSnapshot.ts`（take/restore 的列清单）与 `lib/dataIo.ts`（备份/导入），否则撤销/重做与备份会静默丢字段。

## 4. 撤销 / 重做（快照式）

```
写操作 → recordHistory(label, mutate):
   before = takeSnapshot()        // 4 张表全量快照
   await mutate()                 // 业务写入 + fetchTasks 刷新
   after  = takeSnapshot()
   push {label, before, after} 入 past, 清空 future, 上限 50
Ctrl+Z → restoreSnapshot(before) → 刷新 → 移入 future
Ctrl+Shift+Z → restoreSnapshot(after) → 移回 past
```

优点：对重复任务生成新实例、看板布局重排、批量删除等复合写入天然成立，无需为每种操作写逆操作。代价：每次写多两次 `SELECT`（本地小数据可忽略）。输入框内聚焦时不劫持 `Ctrl+Z`，保留原生文本撤销。

## 5. 提醒引擎

`lib/reminderEngine.ts` 提供纯函数 `computeDueReminders(tasks, now, cooldownMs)` 与 `isInDnd(...)`；`components/layout/ReminderScheduler.tsx` 每 30s 及可见性变化时驱动：

```
scheduled_at - reminder_offset <= now 且 reminder_enabled=1 且未完成
  ├─ now - last_reminded_at < 冷却(默认5min)? → 跳过
  ├─ 免打扰/专注中 → 入队(missedQueue/notificationStore.queue)，离开时汇总补发
  ├─ 首次启动的“错过” → 汇总补发一次并标记
  ├─ 前台 → 应用内 Banner(toast) + 可选提示音
  └─ 后台 → 系统原生通知(notify)
所有派发同时写入“提醒中心”(notificationCenterStore) 并 markReminded 更新 last_reminded_at
```

## 6. IPC 约定

前端 → Rust：
```ts
invoke('set_tray_title', { title })   // 托盘倒计时文本
// 数据读写经 tauri-plugin-sql 命令：db.execute / db.select
```
Rust → 前端事件：
```ts
listen('shortcuts://quick-add', ...)  // 全局 Ctrl+Shift+T → 触发新建
```
前端内部跨组件解耦用 `window` CustomEvent：`flowtask:new` / `flowtask:edit` / `flowtask:inline-edit` / `flowtask:detail` / `flowtask:show-help`。

## 7. Rust 侧（`src-tauri/src/lib.rs`）

`Builder` 注册：opener、window-state、notification、autostart、global-shortcut、sql(带迁移)。`setup` 内：注册 `Ctrl+Shift+T` 快捷键（唤起窗口并 emit 事件）、构建系统托盘（显示/隐藏、退出，`set_tray_title` 命令更新倒计时）。命令 `set_tray_title`。

## 8. 视图与路由

无 React Router：`uiStore.activeView`（inbox/today/upcoming/calendar/kanban/focus/settings）+ `taskMode`（progress/schedule）驱动 `MainView` 的 `switch` 渲染；`Calendar/Kanban/Focus/Settings/Timeline` 用 `React.lazy` 分包。列表 >200 时 `@tanstack/react-virtual` 虚拟化。

## 9. 安全与权限（Capabilities）

`src-tauri/capabilities/default.json` 最小化白名单。关键坑：`sql:default` **不含** `sql:allow-execute`，缺它则所有写操作被权限拒绝（读正常），已显式补齐。新增插件须同步声明其默认权限集。SQL 全参数化防注入；应用不申请任何网络权限，数据不出本机。

## 10. 关键设计取舍

- **前端 Zustand + 直连 SQL 而非 Rust 服务层**：单人本地应用，减少 IPC 往返与样板；Rust 专注系统集成。
- **快照式撤销而非命令逆操作**：实现简单、对复合写正确，代价是内存/多次查询（可接受）。
- **Vite 锁 v6**：目标机 Node 22.11 < Vite7 所需 22.12。
- **不引入 @uiw 编辑器 / chrono-node**：用 textarea + react-markdown 与本地正则日期解析，减少依赖与体积。
