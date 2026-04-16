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
 * 分析子元素的布局模式
 */
function analyzeLayout(children) {
  if (!children || children.length === 0) return null;

  // 过滤掉无效尺寸的元素
  const validChildren = children.filter(c =>
    c.size && c.size.width > 0 && c.size.height > 0 && c.position
  );

  if (validChildren.length < 2) return null;

  // 计算元素的中心点
  const withCenters = validChildren.map(c => ({
    ...c,
    centerX: c.position.left + c.size.width / 2,
    centerY: c.position.top + c.size.height / 2
  }));

  // 按位置排序
  const sortedByX = [...withCenters].sort((a, b) => a.centerX - b.centerX);
  const sortedByY = [...withCenters].sort((a, b) => a.centerY - b.centerY);

  // 计算中心点之间的距离
  let totalHorizontalDistance = 0;
  let totalVerticalDistance = 0;

  for (let i = 1; i < sortedByX.length; i++) {
    totalHorizontalDistance += Math.abs(sortedByX[i].centerX - sortedByX[i - 1].centerX);
  }

  for (let i = 1; i < sortedByY.length; i++) {
    totalVerticalDistance += Math.abs(sortedByY[i].centerY - sortedByY[i - 1].centerY);
  }

  // 判断主要方向：哪个方向的距离更大
  const isVertical = totalVerticalDistance > totalHorizontalDistance;
  const direction = isVertical ? 'column' : 'row';

  // 计算实际间距
  let gaps = [];
  if (isVertical) {
    for (let i = 1; i < sortedByY.length; i++) {
      const prev = sortedByY[i - 1];
      const curr = sortedByY[i];
      const gap = curr.position.top - (prev.position.top + prev.size.height);
      gaps.push(gap);
    }
  } else {
    for (let i = 1; i < sortedByX.length; i++) {
      const prev = sortedByX[i - 1];
      const curr = sortedByX[i];
      const gap = curr.position.left - (prev.position.left + prev.size.width);
      gaps.push(gap);
    }
  }

  const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;

  // 分析对齐方式
  const alignment = analyzeAlignment(validChildren, direction);

  return {
    display: 'flex',
    flexDirection: direction,
    gap: Math.max(0, Math.round(avgGap)),
    ...alignment
  };
}

/**
 * 分析对齐方式
 */
function analyzeAlignment(children, direction) {
  if (direction === 'row') {
    // 水平布局，检查垂直对齐
    const tops = children.map(c => c.position.top);
    const bottoms = children.map(c => c.position.top + c.size.height);
    const centers = children.map(c => c.position.top + c.size.height / 2);

    const topVariance = Math.max(...tops) - Math.min(...tops);
    const bottomVariance = Math.max(...bottoms) - Math.min(...bottoms);
    const centerVariance = Math.max(...centers) - Math.min(...centers);

    if (topVariance < 5) return { alignItems: 'flex-start' };
    if (bottomVariance < 5) return { alignItems: 'flex-end' };
    if (centerVariance < 5) return { alignItems: 'center' };
  } else {
    // 垂直布局，检查水平对齐
    const lefts = children.map(c => c.position.left);
    const rights = children.map(c => c.position.left + c.size.width);
    const centers = children.map(c => c.position.left + c.size.width / 2);

    const leftVariance = Math.max(...lefts) - Math.min(...lefts);
    const rightVariance = Math.max(...rights) - Math.min(...rights);
    const centerVariance = Math.max(...centers) - Math.min(...centers);

    if (leftVariance < 5) return { alignItems: 'flex-start' };
    if (rightVariance < 5) return { alignItems: 'flex-end' };
    if (centerVariance < 5) return { alignItems: 'center' };
  }

  return {};
}

/**
 * 提取图层真实名称（去除修饰符）
 */
function extractLayerName(name) {
  // 如果以 $ 开头，提取到空格或分号之前的部分
  if (name.startsWith('$')) {
    const match = name.match(/^\$([^\s;]+)/);
    if (match) {
      return match[1];
    }
  }

  // 如果以 & 开头（effect 等），提取到空格或分号之前的部分
  if (name.startsWith('&')) {
    const match = name.match(/^&([^\s;]+)/);
    if (match) {
      return match[1];
    }
  }

  // 其他情况，去除特殊字符
  return name.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_');
}

/**
 * 提取图层信息为 JSON 对象
 */
async function layerToJSON(node, outputDir, index, usedNames = new Map()) {
  if (!node || !node.layer) return null;

  const layer = node.layer;

  // 如果图层不可见，直接跳过（包括其子图层）
  if (!layer.visible) return null;

  const left = layer.left;
  const top = layer.top;
  const width = layer.width;
  const height = layer.height;

  const layerData = {
    name: extractLayerName(layer.name),
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

  // 导出图层图片（只导出可见的非文本图层）
  if (!node.isGroup() && layerData.type !== 'text' && width > 0 && height > 0) {
    try {
      const cleanName = extractLayerName(layer.name);

      // 处理重名：如果名称已存在，添加序号
      let imageName = `${cleanName}.png`;
      if (usedNames.has(cleanName)) {
        const count = usedNames.get(cleanName) + 1;
        usedNames.set(cleanName, count);
        imageName = `${cleanName}_${count}.png`;
      } else {
        usedNames.set(cleanName, 0);
      }

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
      .map((child, i) => layerToJSON(child, outputDir, `${index}_${i}`, usedNames));
    const childrenResults = await Promise.all(childrenPromises);
    layerData.children = childrenResults.filter(data => data !== null);

    // 分析布局模式
    if (layerData.children.length > 0) {
      const layout = analyzeLayout(layerData.children);
      if (layout) {
        layerData.layout = layout;
      }
    }
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

  // 用于跟踪已使用的文件名
  const usedNames = new Map();

  // 提取图层信息
  const layerPromises = tree.children()
    .map((node, i) => layerToJSON(node, outputDir, i, usedNames));
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
