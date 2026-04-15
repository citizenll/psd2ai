# 发布到 NPM 指南

## 前置准备

1. **注册 NPM 账号**
   访问 https://www.npmjs.com/ 注册账号

2. **登录 NPM**
   ```bash
   npm login
   ```

3. **检查包名是否可用**
   ```bash
   npm search psd2ai
   ```

## 发布步骤

### 1. 更新 package.json

确保以下字段正确：
- `name`: 包名（必须唯一）
- `version`: 版本号（遵循语义化版本）
- `description`: 描述
- `repository`: GitHub 仓库地址
- `keywords`: 关键词（便于搜索）
- `license`: 许可证

### 2. 测试本地安装

```bash
# 在项目目录下
npm link

# 测试全局命令
psd2ai --help
psd2ai test.psd output

# 取消链接
npm unlink -g psd2ai
```

### 3. 发布到 NPM

```bash
# 首次发布
npm publish

# 如果包名被占用，可以使用 scoped package
npm publish --access public
```

### 4. 更新版本

```bash
# 补丁版本（bug 修复）
npm version patch

# 次版本（新功能）
npm version minor

# 主版本（破坏性更新）
npm version major

# 发布新版本
npm publish
```

## 使用方式

发布后，用户可以通过以下方式使用：

### 全局安装
```bash
npm install -g psd2ai
psd2ai design.psd
```

### npx（无需安装）
```bash
npx psd2ai design.psd
```

### 项目依赖
```bash
npm install psd2ai
```

```javascript
import { convertPSD } from 'psd2ai';

await convertPSD('design.psd', 'output');
```

## GitHub 发布

### 1. 创建 GitHub 仓库

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/citizenll/psd2ai.git
git push -u origin main
```

### 2. 创建 Release

1. 在 GitHub 仓库页面点击 "Releases"
2. 点击 "Create a new release"
3. 填写版本号（如 v1.0.0）
4. 填写发布说明
5. 发布

### 3. 添加 Badge

在 README.md 中添加：

```markdown
[![npm version](https://badge.fury.io/js/psd2ai.svg)](https://www.npmjs.com/package/psd2ai)
[![downloads](https://img.shields.io/npm/dm/psd2ai.svg)](https://www.npmjs.com/package/psd2ai)
[![license](https://img.shields.io/npm/l/psd2ai.svg)](https://github.com/citizenll/psd2ai/blob/main/LICENSE)
```

## 注意事项

1. **不要发布敏感信息**
   - 检查 `.gitignore` 和 `.npmignore`
   - 不要包含测试文件、PSD 文件等

2. **版本管理**
   - 遵循语义化版本规范
   - 每次发布前更新 CHANGELOG.md

3. **测试**
   - 发布前在本地充分测试
   - 可以先发布到 npm 的测试环境

4. **文档**
   - 保持 README.md 更新
   - 提供清晰的使用示例

## 撤销发布

```bash
# 撤销指定版本（发布后 72 小时内）
npm unpublish psd2ai@1.0.0

# 撤销整个包（慎用）
npm unpublish psd2ai --force
```

## 常见问题

**Q: 包名被占用怎么办？**
A: 使用 scoped package，如 `@citizenll/psd2ai`

**Q: 如何更新已发布的包？**
A: 修改代码后，使用 `npm version` 更新版本号，然后 `npm publish`

**Q: 如何查看包的下载量？**
A: 访问 https://www.npmjs.com/package/psd2ai

**Q: 如何设置包的访问权限？**
A: 使用 `npm publish --access public` 发布公开包
