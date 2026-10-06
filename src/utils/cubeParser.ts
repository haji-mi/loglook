import { ParsedLut } from '../types';

// 优先排列的 5 个指定 LUT 名称
const PREFERRED_ORDER = [
  'Clean709',
  'WarmFilm',
  'TealOrange',
  'FadedVintage',
  'MonoBW',
];

/**
 * 解析单个 .cube 文件内容
 * @param content 文件文本内容
 * @param fileName 原始文件名
 */
export function parseCubeContent(content: string, fileName: string): ParsedLut {
  const lines = content.split(/\r?\n/);

  let size: number | null = null;
  let domainMin: [number, number, number] = [0, 0, 0];
  let domainMax: [number, number, number] = [1, 1, 1];

  const rgbValues: number[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex].trim();
    if (!rawLine) continue;

    // 跳过注释
    if (rawLine.startsWith('#')) continue;

    // 跳过 TITLE
    if (/^TITLE\b/i.test(rawLine)) continue;

    // 解析 LUT_3D_SIZE
    const sizeMatch = rawLine.match(/^LUT_3D_SIZE\s+(\d+)/i);
    if (sizeMatch) {
      size = parseInt(sizeMatch[1], 10);
      if (isNaN(size) || size <= 1) {
        throw new Error(`文件「${fileName}」中 LUT_3D_SIZE 不合法: ${sizeMatch[1]}`);
      }
      continue;
    }

    // 检查是否为不支持的 1D LUT
    if (/^LUT_1D_SIZE\b/i.test(rawLine)) {
      throw new Error(`文件「${fileName}」是 1D LUT，当前仅支持 3D LUT 格式`);
    }

    // 解析 DOMAIN_MIN
    const minMatch = rawLine.match(/^DOMAIN_MIN\s+([-\d.eE]+)\s+([-\d.eE]+)\s+([-\d.eE]+)/i);
    if (minMatch) {
      domainMin = [
        parseFloat(minMatch[1]),
        parseFloat(minMatch[2]),
        parseFloat(minMatch[3]),
      ];
      continue;
    }

    // 解析 DOMAIN_MAX
    const maxMatch = rawLine.match(/^DOMAIN_MAX\s+([-\d.eE]+)\s+([-\d.eE]+)\s+([-\d.eE]+)/i);
    if (maxMatch) {
      domainMax = [
        parseFloat(maxMatch[1]),
        parseFloat(maxMatch[2]),
        parseFloat(maxMatch[3]),
      ];
      continue;
    }

    // 解析 RGB 数据行
    // 通常一行是三个数字，用空格或制表符分隔
    const parts = rawLine.split(/\s+/);
    if (parts.length >= 3) {
      const r = parseFloat(parts[0]);
      const g = parseFloat(parts[1]);
      const b = parseFloat(parts[2]);

      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        rgbValues.push(r, g, b);
      }
    }
  }

  if (size === null) {
    throw new Error(`文件「${fileName}」缺失关键字段 LUT_3D_SIZE`);
  }

  const expectedDataPoints = size * size * size;
  const actualDataPoints = rgbValues.length / 3;

  if (actualDataPoints !== expectedDataPoints) {
    throw new Error(
      `文件「${fileName}」数据点数量错误：声明尺寸为 ${size}^3 = ${expectedDataPoints}，实际读取到 ${actualDataPoints} 个点`
    );
  }

  // 构造 RGBA Float32Array 与 Uint8Array
  const data = new Float32Array(expectedDataPoints * 4);
  const byteData = new Uint8Array(expectedDataPoints * 4);

  const rangeR = domainMax[0] - domainMin[0] || 1;
  const rangeG = domainMax[1] - domainMin[1] || 1;
  const rangeB = domainMax[2] - domainMin[2] || 1;

  for (let i = 0; i < expectedDataPoints; i++) {
    const rawR = rgbValues[i * 3 + 0];
    const rawG = rgbValues[i * 3 + 1];
    const rawB = rgbValues[i * 3 + 2];

    // 归一化并 clamp 到 0~1
    const normR = Math.max(0, Math.min(1, (rawR - domainMin[0]) / rangeR));
    const normG = Math.max(0, Math.min(1, (rawG - domainMin[1]) / rangeG));
    const normB = Math.max(0, Math.min(1, (rawB - domainMin[2]) / rangeB));

    const offset = i * 4;
    data[offset + 0] = normR;
    data[offset + 1] = normG;
    data[offset + 2] = normB;
    data[offset + 3] = 1.0;

    byteData[offset + 0] = Math.round(normR * 255);
    byteData[offset + 1] = Math.round(normG * 255);
    byteData[offset + 2] = Math.round(normB * 255);
    byteData[offset + 3] = 255;
  }

  // LUT 名称 = 文件名去掉 .cube（不区分大小写扩展名）
  const name = fileName.replace(/\.cube$/i, '');
  const id = `${name}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    id,
    name,
    fileName,
    size,
    domainMin,
    domainMax,
    data,
    byteData,
  };
}

/**
 * 按照规范对解析出的 LUT 列表进行排序：
 * 匹配 Clean709、WarmFilm、TealOrange、FadedVintage、MonoBW 时按此顺序排列，
 * 其余的排在后面
 */
export function sortLutList(luts: ParsedLut[]): ParsedLut[] {
  return [...luts].sort((a, b) => {
    const indexA = PREFERRED_ORDER.indexOf(a.name);
    const indexB = PREFERRED_ORDER.indexOf(b.name);

    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    if (indexA !== -1) {
      return -1;
    }
    if (indexB !== -1) {
      return 1;
    }
    return a.name.localeCompare(b.name, 'zh-CN');
  });
}
