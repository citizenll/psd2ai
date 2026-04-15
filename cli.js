#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取 package.json 获取版本号
const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'));

// 解析命令行参数
const args = process.argv.slice(2);

// 显示帮助信息
function showHelp() {
  console.log(`
PSD2AI v${packageJson.version}
将 PSD 设计稿转换为 AI 可读的结构化数据

用法:
  psd2ai <psd-file> [output-dir]

参数:
  psd-file      PSD 文件路径（必需）
  output-dir    输出目录（可选，默认为 'output'）

选项:
  -h, --help     显示帮助信息
  -v, --version  显示版本号

示例:
  psd2ai design.psd
  psd2ai design.psd my-output
  psd2ai ./path/to/design.psd ./export

输出结构:
  output/
  ├── README.md              # AI 使用说明
  ├── layout.json            # 布局数据
  ├── preview.png            # 完整预览图
  ├── layer_*.png            # 原始图层
  └── thumb/                 # 缩略图（适合 AI 读取）

更多信息: https://github.com/citizenll/psd2ai
`);
}

// 显示版本号
function showVersion() {
  console.log(`psd2ai v${packageJson.version}`);
}

// 处理命令行参数
if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  showHelp();
  process.exit(0);
}

if (args.includes('-v') || args.includes('--version')) {
  showVersion();
  process.exit(0);
}

// 获取 PSD 文件路径和输出目录
const psdFile = resolve(args[0]);
const outputDir = args[1] ? resolve(args[1]) : resolve('output');

// 动态导入主模块
import('./index.js').then(module => {
  module.convertPSD(psdFile, outputDir);
}).catch(err => {
  console.error('错误:', err.message);
  process.exit(1);
});
