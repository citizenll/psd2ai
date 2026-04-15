# 贡献指南

感谢你对 PSD2AI 的关注！

## 如何贡献

### 报告 Bug

如果你发现了 bug，请在 [Issues](https://github.com/citizenll/psd2ai/issues) 中提交，包含：

- 问题描述
- 复现步骤
- 预期行为
- 实际行为
- 环境信息（Node.js 版本、操作系统等）

### 提交功能建议

欢迎在 Issues 中提交功能建议，说明：

- 功能描述
- 使用场景
- 为什么需要这个功能

### 提交代码

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交你的修改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启一个 Pull Request

### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/citizenll/psd2ai.git
cd psd2ai

# 安装依赖
npm install

# 本地测试
node index.js test.psd output
```

### 代码规范

- 使用 ES6+ 语法
- 添加必要的注释
- 保持代码简洁清晰

## 发布流程

1. 更新版本号 (`npm version patch/minor/major`)
2. 更新 CHANGELOG.md
3. 提交并推送
4. 发布到 npm (`npm publish`)

## 问题讨论

如有任何问题，欢迎在 Issues 中讨论。
