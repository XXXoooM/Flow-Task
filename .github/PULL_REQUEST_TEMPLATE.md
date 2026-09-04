## 变更说明

<!-- 简述本次变更做了什么、为什么 -->

## 关联 Issue

Closes #

## 变更类型

- [ ] 🐛 Bug 修复
- [ ] ✨ 新功能
- [ ] 📝 文档更新
- [ ] ♻️ 重构
- [ ] 🧪 测试
- [ ] 🔧 构建 / 配置

## 自查清单

- [ ] `npm run build`（含 `tsc`）通过
- [ ] `cargo build` 通过（如涉及 Rust / 迁移 / 权限）
- [ ] 数据库表结构变更已以新增 `NNN_*.sql` 迁移实现，并同步 `lib/dbSnapshot.ts` 列清单
- [ ] 新增插件已在 `capabilities/default.json` 声明所需权限（注意写权限 `sql:allow-execute`）
- [ ] 无 `any` 类型引入；关键路径做过运行时验证
- [ ] Commit 符合 Conventional Commits

## 截图 / 录屏（UI 变更必须）

<!-- 拖拽上传 -->

## 补充说明

<!-- 其他需要说明的内容 -->
