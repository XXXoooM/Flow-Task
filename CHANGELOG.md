# Changelog

所有重要变更都记录在此文件中。
格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.3.0] - 2026-09-05

双模式：日程模式与提醒系统。

### Added
- **日程模式**：`tasks` 新增 `scheduled_at / reminder_enabled / reminder_offset / last_reminded_at`（迁移 `004`），顶部「⚡进度 / 📅日程」模式切换。
- **时间选择器**：新建/编辑支持日期时间（`datetime-local`）、到时提醒开关（默认关闭）、提前量（准时/5·15·30·60 分钟）。
- **提醒引擎**（`lib/reminderEngine.ts` + `ReminderScheduler`）：`scheduled_at − offset ≤ now` 触发、5 分钟冷却、前台应用内横幅/后台系统通知、专注排队、免打扰时段入队并在结束后汇总补发、启动时错过补发。
- **24h 时间轴视图**（`TimelineView`）：小时网格、现在线、节点实心/空心区分完成、`@dnd-kit` 拖拽到半小时槽改时间、日期导航。
- **提醒中心**（`notificationCenterStore` + 标题栏铃铛）：未读红点角标、集中回看、点击跳转任务、全部已读/清空。
- **自然语言日程语法**：`明天下午3点 !remind15` → 解析为带提醒的日程任务。

### Fixed
- 修正托盘倒计时命令名（`set_tray_title`）。

## [1.2.0] - 2026-09-05

体验打磨。

### Added
- **状态可见性**：`statusStore` 保存脉冲（保存中/已保存/失败/离线），标题栏指示器 + 状态栏常驻离线告警与重试。
- **通知分级**：紧急（P0 到期，系统通知 + 横幅 + 声音）/ 普通（应用内 Toast）/ 静默（默认关闭），设置可逐项开关。
- **全键盘操作**：`↑↓` 导航、`Enter` 内联编辑、`Space` 完成、`Delete` 删除、`Ctrl+1/2/3` 切视图、`?` 快捷键帮助面板。
- **空状态引导**：首次「导入示例」、搜索无果「清除筛选」、今日全成庆祝引导。
- **色盲友好模式**：优先级/状态在颜色之外叠加文字与形状。
- **拖拽容错**：`TouchSensor` 长按 200ms、`DragOverlay` 预览、5px 阈值防误触、`Esc` 取消。

## [1.1.0] - 2026-09-05

效率深化。

### Added
- **内联编辑**：单击标题改标题（Enter 保存 / Esc 取消）、点色条循环优先级、点日期内联改期。
- **自然语言快添**：`!p0 !p1..` 优先级、`#标签`、中文相对日期（今天/明天/后天/下周X/X月X日），实时预览。
- **撤销 / 重做全覆盖**：快照式历史栈（`historyStore` + `dbSnapshot`），`Ctrl+Z`/`Ctrl+Shift+Z`，删除/批量操作 Toast 一键撤销。
- **智能默认值**：继承上次优先级/标签、按视图预填截止日、新任务默认 P2。
- **上下文快捷操作**：卡片悬浮操作 + 命令面板入口。

### Changed
- 新任务默认优先级由 P3 调整为 P2。

## [1.0.0] - 2026-09-04

首个完整版本。

### Added
- 🎉 任务管理：增删改查、子任务（嵌套）、多色标签、优先级 P0–P3、截止日期、重复任务（完成后自动顺延）、拖拽排序、Markdown 备注。
- 三视图：列表（收集箱/今天/计划）、日历（FullCalendar 月/周，点击新建、拖拽改期）、看板（自定义列 + 跨列拖拽，`applyBoardLayout` 持久化）。
- 专注：可配置番茄钟（工作/短/长休息）、SVG 环形进度、提示音、日/周专注统计（`focus_sessions`）。
- 系统集成：任务到期与番茄结束通知、系统托盘（显示/隐藏、退出、倒计时）、全局快捷键、开机自启。
- 效率：`Ctrl+K` 命令面板（cmdk）、全文搜索、筛选、批量操作、删除撤销 Toast。
- 外观与数据：亮/暗/跟随系统主题、任务详情 Markdown 只读渲染（代码高亮）+ 编辑、数据导出（JSON/CSV）与导入。
- 架构：Tauri 2 + React 19 + Vite 6 + Tailwind v4 + Zustand（persist）+ SQLite（`tauri-plugin-sql`，版本化迁移 001–003）、重型视图 `React.lazy` 分包、`@tanstack/react-virtual` 虚拟列表、`tauri-plugin-window-state` 窗口记忆。
- CI/CD：GitHub Actions 自动发版（tag 触发三平台构建 + Release）。

[1.3.0]: https://github.com/XXXoooM/Flow-Task/releases/tag/v1.3.0
[1.2.0]: https://github.com/XXXoooM/Flow-Task/releases/tag/v1.2.0
[1.1.0]: https://github.com/XXXoooM/Flow-Task/releases/tag/v1.1.0
[1.0.0]: https://github.com/XXXoooM/Flow-Task/releases/tag/v1.0.0
