# 贡献指南

感谢你对 **FlowTask** 的关注！在提交贡献前，请花几分钟阅读本指南。

## 开发环境搭建

```bash
# 需要：Node.js ≥ 20（推荐 22.x）、Rust stable、VS Build Tools(Win)/Xcode CLT(mac)/webkit2gtk(Linux)
git clone https://github.com/XXXoooM/Flow-Task.git
cd Flow-Task
npm install
npm run tauri dev      # 开发模式（Vite 热重载 + Rust，首次编译较久）
```

## 项目结构

- `src/` — React + TypeScript 前端（stores / hooks / lib / components）
- `src-tauri/` — Rust 后端：`src/lib.rs`（插件、托盘、快捷键、迁移注册）、`migrations/*.sql`、`capabilities/default.json`、`tauri.conf.json`
- `docs/` — 架构与路线图文档

## 分支策略

| 分支 | 用途 |
|:---|:---|
| `main` | 稳定分支，仅通过 PR 合入 |
| `feature/xxx` | 新功能 |
| `fix/xxx` | 缺陷修复 |
| `docs/xxx` | 文档更新 |

## 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)：

```
feat: 新增日程模式时间选择器
fix: 修正看板拖拽后排序权重计算
docs: 补充架构文档 IPC 章节
refactor: 提醒引擎改为纯函数判定
chore: 升级 vite 到 6.4.x
```

## 代码规范

- **TypeScript 严格模式**：`tsconfig.json` 开启 `strict` 与 `noUnusedLocals/Parameters`，禁止 `any`（必要处用 `unknown` 或窄化）。提交前须 `npm run build` 通过。
- **组件**：PascalCase 文件名与组件名一致；UI 原子放 `components/ui`，业务组件按域分目录。
- **状态**：Store 以 `xxxStore` 命名；写操作一律经 `historyStore.recordHistory(label, mutate)` 以纳入撤销/重做，并在 `lib/dbSnapshot.ts` 的列清单中同步新字段。
- **数据库**：所有 SQL 使用 `$1 / ?` 参数化查询，禁止字符串拼接；表结构变更以新增 `NNN_*.sql` 迁移实现，不改历史迁移。
- **Rust**：`cargo fmt` + `cargo clippy` 无警告；`capabilities/default.json` 权限最小化，新增插件需同步声明（尤其 `sql:allow-execute` 这类不在默认集内的写权限）。

## 测试

当前仓库尚未接入自动化测试框架。新增逻辑请至少：
1. 通过 `npm run build`（含 `tsc`）；
2. 在 `src-tauri/` 下通过 `cargo build`；
3. 若改动数据库/提醒逻辑，参照现有做法做一次运行时验证（如临时写入探针结果到临时文件后核对，验证完移除）。

计划引入 Vitest / Testing Library / Playwright（见路线图 v1.5），届时 PR 需附对应测试。

## Pull Request 流程

1. Fork 并在 `main` 上创建功能分支：`git checkout -b feature/xxx`
2. 编码 + 自测（`npm run build` / `cargo build`）
3. Conventional Commit：`git commit -m "feat: ..."`
4. 推送并开 PR，填写模板中的自查清单
5. 等待 Review（请保持 diff 聚焦、必要时拆分）

## Issue 规范

- 缺陷请用 **Bug Report** 模板、功能建议用 **Feature Request** 模板；提交前先搜索避免重复。

## 许可

提交即表示你同意你的贡献以 [MIT License](./LICENSE) 发布。
