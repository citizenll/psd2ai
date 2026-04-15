import PSD from 'psd';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import sharp from 'sharp';

/**
 * 生成缩略图
 */
async function createThumbnail(imagePath, thumbPath, maxWidth = 400) {
  try {
    // 确保源文件存在
    if (!existsSync(imagePath)) {
      console.log(`  缩略图跳过: 源文件不存在 ${basename(imagePath)}`);
      return;
    }

    // 读取文件并处理
    const imageBuffer = readFileSync(imagePath);
    await sharp(imageBuffer)
      .resize(maxWidth, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .png()
      .toFile(thumbPath);

    console.log(`  ✓ ${basename(imagePath)}`);
  } catch (e) {
    console.log(`  ✗ ${basename(imagePath)}: ${e.message}`);
  }
}

/**
 * 提取图层信息为 JSON 对象
 */
async function layerToJSON(node, outputDir, index) {
  if (!node || !node.layer) return null;

  const layer = node.layer;

  // 跳过不可见图层
  if (!layer.visible) return null;

  const left = layer.left;
  const top = layer.top;
  const width = layer.width;
  const height = layer.height;

  // 跳过无效尺寸
  if (width <= 0 || height <= 0) return null;

  const layerData = {
    name: layer.name || 'Layer',
    type: node.isGroup() ? 'group' : 'layer',
    visible: layer.visible,
    opacity: layer.opacity / 255,
    position: { left, top },
    size: { width, height },
    bounds: { left, top, right: left + width, bottom: top + height }
  };

  // 提取文本内容
  if (!node.isGroup() && layer.typeTool) {
    try {
      const text = layer.typeTool();
      if (text && text.textValue) {
        layerData.type = 'text';
        layerData.text = {
          content: text.textValue,
          fontSize: text.sizes?.[0] || 14,
          color: text.colors?.[0] || [0, 0, 0, 255]
        };
      }
    } catch (e) {
      // 忽略文本提取错误
    }
  }

  // 导出图层图片
  if (!node.isGroup() && layerData.type !== 'text') {
    try {
      const imageName = `layer_${index}_${layer.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      const imagePath = join(outputDir, imageName);
      node.layer.image.saveAsPng(imagePath);
      layerData.image = imageName;
      layerData.thumbnail = `thumb/${imageName}`;

      console.log(`  导出图层: ${layer.name} -> ${imageName}`);
    } catch (e) {
      console.log(`  跳过图层: ${layer.name} (无图像数据)`);
    }
  }

  // 处理子图层（组）
  if (node.children && node.children().length > 0) {
    const childrenPromises = node.children()
      .map((child, i) => layerToJSON(child, outputDir, `${index}_${i}`));
    const childrenResults = await Promise.all(childrenPromises);
    layerData.children = childrenResults.filter(data => data !== null);
  }

  return layerData;
}

/**
 * 生成 README 文档
 */
function generateReadme(jsonData) {
  const { name, size, layers } = jsonData;

  let readme = `# ${name} - PSD 布局导出

## AI Prompt 使用说明

当你需要让 AI 理解这个 PSD 设计稿的布局时，可以使用以下 prompt：

\`\`\`
我有一个设计稿的布局数据，请阅读 layout.json 文件了解所有图层的位置和尺寸信息。

设计稿尺寸：${size.width}x${size.height}px
图层数量：${layers.length}

请查看 thumb/ 目录下的缩略图来理解每个图层的视觉内容（缩略图是压缩版本，适合 AI 快速读取）。
完整的预览图在 preview.png，可以查看整体效果。

根据这些信息，帮我 [你的具体需求，例如：生成对应的 HTML/CSS 代码、分析布局结构、提取设计规范等]
\`\`\`

## 文件结构

\`\`\`
${name}/
├── layout.json          # 布局数据（包含所有图层的位置、尺寸、类型等信息）
├── preview.png          # 整体预览图（完整尺寸）
├── README.md            # 本文件
├── thumb/               # 缩略图目录（适合 AI 读取，最大宽度 400px）
│   ├── preview.png      # 整体预览缩略图
│   └── layer_*.png      # 各图层缩略图
└── layer_*.png          # 原始图层图片（完整尺寸）
\`\`\`

## 设计稿信息

- **名称**: ${name}
- **尺寸**: ${size.width} x ${size.height} px
- **图层数量**: ${layers.length}

## 图层列表

`;

  layers.forEach((layer, index) => {
    readme += `### ${index + 1}. ${layer.name}\n\n`;
    readme += `- **类型**: ${layer.type === 'text' ? '文本' : layer.type === 'group' ? '组' : '图片'}\n`;
    readme += `- **位置**: (${layer.position.left}, ${layer.position.top})\n`;
    readme += `- **尺寸**: ${layer.size.width} x ${layer.size.height} px\n`;
    readme += `- **透明度**: ${(layer.opacity * 100).toFixed(0)}%\n`;

    if (layer.text) {
      readme += `- **文本内容**: "${layer.text.content}"\n`;
      readme += `- **字号**: ${layer.text.fontSize}px\n`;
    }

    if (layer.image) {
      readme += `- **原图**: ${layer.image}\n`;
    }

    if (layer.thumbnail) {
      readme += `- **缩略图**: ${layer.thumbnail}\n`;
    }

    readme += `\n`;
  });

  readme += `## 使用建议

### 1. 快速预览
查看 \`thumb/preview.png\` 了解整体设计效果（文件较小，加载快）

### 2. 详细分析
阅读 \`layout.json\` 获取精确的布局数据：
- 每个元素的坐标和尺寸
- 文本内容和样式
- 图层层级关系

### 3. 视觉理解
查看 \`thumb/\` 目录下的图层缩略图，理解每个元素的视觉内容

### 4. 完整资源
如需完整尺寸的图片，使用根目录下的 \`layer_*.png\` 和 \`preview.png\`

## 为什么使用缩略图？

- **文件更小**: 缩略图大小通常是原图的 1/10，AI 读取更快
- **信息足够**: 对于理解布局和内容，缩略图已经提供足够的视觉信息
- **节省资源**: 减少 token 消耗和处理时间

## 常见用途

1. **生成代码**: 让 AI 根据布局生成 HTML/CSS/React 等代码
2. **设计分析**: 分析设计规范、间距、对齐关系
3. **响应式适配**: 基于原始布局生成响应式设计方案
4. **组件拆分**: 识别可复用的 UI 组件
5. **设计还原**: 对比设计稿和实现的差异

---

生成时间: ${new Date().toLocaleString('zh-CN')}
`;

  return readme;
}

/**
 * 转换 PSD 为 JSON
 */
async function psdToJSON(psdPath, outputDir) {
  console.log(`读取 PSD 文件: ${psdPath}`);

  // 创建输出目录
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // 创建缩略图目录
  const thumbDir = join(outputDir, 'thumb');
  if (!existsSync(thumbDir)) {
    mkdirSync(thumbDir, { recursive: true });
  }

  // 读取 PSD 文件
  const psd = await PSD.open(psdPath);
  const tree = psd.tree();

  console.log(`PSD 尺寸: ${psd.header.width}x${psd.header.height}`);
  console.log(`图层数量: ${tree.children().length}`);
  console.log(`\n开始导出图层...`);

  // 提取图层信息
  const layerPromises = tree.children()
    .map((node, i) => layerToJSON(node, outputDir, i));
  const layerResults = await Promise.all(layerPromises);
  const layers = layerResults.filter(data => data !== null);

  // 生成 JSON 数据
  const jsonData = {
    name: basename(psdPath, '.psd'),
    size: {
      width: psd.header.width,
      height: psd.header.height
    },
    layers: layers
  };

  // 导出整体预览图
  console.log(`\n导出整体预览...`);
  const previewPath = join(outputDir, 'preview.png');
  psd.image.saveAsPng(previewPath);
  console.log(`预览图已生成: ${previewPath}`);

  // 等待文件系统写入完成（psd 库的 saveAsPng 可能有异步操作）
  await new Promise(resolve => setTimeout(resolve, 500));

  // 批量生成缩略图
  console.log(`\n生成缩略图...`);
  const thumbTasks = [];

  // 预览图缩略图
  const previewThumbPath = join(thumbDir, 'preview.png');
  if (existsSync(previewPath)) {
    thumbTasks.push(createThumbnail(previewPath, previewThumbPath, 800));
  }

  // 图层缩略图
  for (const layer of layers) {
    if (layer.image) {
      const imagePath = join(outputDir, layer.image);
      const thumbPath = join(thumbDir, layer.image);
      if (existsSync(imagePath)) {
        thumbTasks.push(createThumbnail(imagePath, thumbPath));
      }
    }
  }

  await Promise.all(thumbTasks);
  console.log(`缩略图已生成: ${thumbDir}`);

  // 写入 JSON 文件
  const jsonPath = join(outputDir, 'layout.json');
  writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
  console.log(`JSON 已生成: ${jsonPath}`);

  // 生成 README
  const readme = generateReadme(jsonData);
  const readmePath = join(outputDir, 'README.md');
  writeFileSync(readmePath, readme, 'utf-8');
  console.log(`README 已生成: ${readmePath}`);

  console.log(`\n所有文件已导出到: ${outputDir}`);
}

// 执行转换
export async function convertPSD(psdFile, outputDir) {
  return psdToJSON(psdFile, outputDir);
}

// 命令行直接调用
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const psdFile = process.argv[2] || '故事绘本出图.psd';
  const outputDir = process.argv[3] || 'output';

  convertPSD(psdFile, outputDir).catch(err => {
    console.error('转换失败:', err);
    process.exit(1);
  });
}
