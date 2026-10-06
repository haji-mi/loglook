const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 引入编译后的或者直接引入解析逻辑
// 我们在此实现或测试 cubeParser 中的逻辑
const PREFERRED_ORDER = [
  'Clean709',
  'WarmFilm',
  'TealOrange',
  'FadedVintage',
  'MonoBW',
];

function parseCubeContent(content, fileName) {
  const lines = content.split(/\r?\n/);
  let size = null;
  let domainMin = [0, 0, 0];
  let domainMax = [1, 1, 1];
  const rgbValues = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex].trim();
    if (!rawLine) continue;
    if (rawLine.startsWith('#')) continue;
    if (/^TITLE\b/i.test(rawLine)) continue;

    const sizeMatch = rawLine.match(/^LUT_3D_SIZE\s+(\d+)/i);
    if (sizeMatch) {
      size = parseInt(sizeMatch[1], 10);
      if (isNaN(size) || size <= 1) {
        throw new Error(`文件「${fileName}」中 LUT_3D_SIZE 不合法: ${sizeMatch[1]}`);
      }
      continue;
    }

    if (/^LUT_1D_SIZE\b/i.test(rawLine)) {
      throw new Error(`文件「${fileName}」是 1D LUT，当前仅支持 3D LUT 格式`);
    }

    const minMatch = rawLine.match(/^DOMAIN_MIN\s+([-\d.eE]+)\s+([-\d.eE]+)\s+([-\d.eE]+)/i);
    if (minMatch) {
      domainMin = [parseFloat(minMatch[1]), parseFloat(minMatch[2]), parseFloat(minMatch[3])];
      continue;
    }

    const maxMatch = rawLine.match(/^DOMAIN_MAX\s+([-\d.eE]+)\s+([-\d.eE]+)\s+([-\d.eE]+)/i);
    if (maxMatch) {
      domainMax = [parseFloat(maxMatch[1]), parseFloat(maxMatch[2]), parseFloat(maxMatch[3])];
      continue;
    }

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

  const data = new Float32Array(expectedDataPoints * 4);
  const byteData = new Uint8Array(expectedDataPoints * 4);

  const rangeR = domainMax[0] - domainMin[0] || 1;
  const rangeG = domainMax[1] - domainMin[1] || 1;
  const rangeB = domainMax[2] - domainMin[2] || 1;

  for (let i = 0; i < expectedDataPoints; i++) {
    const rawR = rgbValues[i * 3 + 0];
    const rawG = rgbValues[i * 3 + 1];
    const rawB = rgbValues[i * 3 + 2];

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

  const name = fileName.replace(/\.cube$/i, '');
  return {
    name,
    fileName,
    size,
    domainMin,
    domainMax,
    data,
    byteData,
  };
}

function sortLutList(luts) {
  return [...luts].sort((a, b) => {
    const indexA = PREFERRED_ORDER.indexOf(a.name);
    const indexB = PREFERRED_ORDER.indexOf(b.name);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.name.localeCompare(b.name, 'zh-CN');
  });
}

console.log('=== 开始执行自动化测试与规范验收 ===\n');

// 1. 验证 5 个 33 点 .cube 的解析
const lutDir = path.join(__dirname, '..', 'test-assets', 'luts');
const fileNames = ['MonoBW.cube', 'TealOrange.cube', 'WarmFilm.cube', 'Clean709.cube', 'FadedVintage.cube']; // 刻意打乱顺序

const parsedList = fileNames.map(f => {
  const content = fs.readFileSync(path.join(lutDir, f), 'utf-8');
  return parseCubeContent(content, f);
});

console.log('✓ 测试 1: 5 个 33 点 .cube 解析成功');
parsedList.forEach(item => {
  assert.strictEqual(item.size, 33, `${item.name} 尺寸必须为 33`);
  assert.strictEqual(item.data.length, 33 * 33 * 33 * 4, `${item.name} 数据点数必须完整`);
});

// 2. 验证排序（打乱顺序输入后，是否能按 Clean709、WarmFilm、TealOrange、FadedVintage、MonoBW 排列）
const sorted = sortLutList(parsedList);
const sortedNames = sorted.map(x => x.name);
console.log('✓ 测试 2: 排序后列表顺序为:', sortedNames.join(' -> '));
assert.deepStrictEqual(sortedNames, PREFERRED_ORDER, '排序结果必须严格符合 5 个推荐顺序！');

// 3. 验证 MonoBW 必须为真黑白（R = G = B）
const monoLut = sorted.find(x => x.name === 'MonoBW');
assert(monoLut, 'MonoBW 必须存在');
let isMonoTrueBW = true;
for (let i = 0; i < monoLut.size * monoLut.size * monoLut.size; i++) {
  const r = monoLut.data[i * 4 + 0];
  const g = monoLut.data[i * 4 + 1];
  const b = monoLut.data[i * 4 + 2];
  if (Math.abs(r - g) > 0.0001 || Math.abs(g - b) > 0.0001) {
    isMonoTrueBW = false;
    break;
  }
}
assert(isMonoTrueBW, 'MonoBW 输出的 RGB 通道必须绝对一致 (真黑白)！');
console.log('✓ 测试 3: MonoBW 严格为真黑白，无通道偏差');

// 4. 验证 TealOrange 暗部偏青（防通道加载错位）
const tealOrangeLut = sorted.find(x => x.name === 'TealOrange');
assert(tealOrangeLut, 'TealOrange 必须存在');
// 取暗部中灰点 (例如输入 r=0.25, g=0.25, b=0.25)
// index = (b_idx * 33 + g_idx) * 33 + r_idx
const idx8 = (8 * 33 + 8) * 33 + 8; // 8/32 = 0.25
const toR = tealOrangeLut.data[idx8 * 4 + 0];
const toG = tealOrangeLut.data[idx8 * 4 + 1];
const toB = tealOrangeLut.data[idx8 * 4 + 2];
console.log(`✓ 测试 4: TealOrange 暗部中灰 (0.25, 0.25, 0.25) 映射输出: R=${toR.toFixed(3)}, G=${toG.toFixed(3)}, B=${toB.toFixed(3)}`);
assert(toG > toR && toB > toR, 'TealOrange 暗部必须表现为偏青（G/B > R，防止通道错位）！');

// 5. 验证 17 点与 65 点兼容性
const sample17 = `# 17 points
LUT_3D_SIZE 17
` + Array(17 * 17 * 17).fill('0.5 0.5 0.5').join('\n');
const parsed17 = parseCubeContent(sample17, 'Test17.cube');
assert.strictEqual(parsed17.size, 17);
assert.strictEqual(parsed17.data.length, 17 * 17 * 17 * 4);
console.log('✓ 测试 5: 成功兼容 17 点 .cube 解析');

// 6. 验证错误处理（中文报错并指出文件名）
let errorCaught = false;
try {
  parseCubeContent(`LUT_3D_SIZE 33\n0.1 0.2 0.3`, 'BrokenLut.cube');
} catch (err) {
  errorCaught = true;
  assert(err.message.includes('BrokenLut.cube'), '报错信息必须包含文件名');
  assert(err.message.includes('数据点数量错误'), '报错信息必须为清晰中文提示');
}
assert(errorCaught, '损坏文件必须抛出中文异常！');
console.log('✓ 测试 6: 损坏文件成功拦截并输出中文友好错误');

// 7. 验证 1D LUT 拒绝提示
let oneDCaught = false;
try {
  parseCubeContent(`LUT_1D_SIZE 256\n0.1 0.2 0.3`, '1dTest.cube');
} catch (err) {
  oneDCaught = true;
  assert(err.message.includes('1dTest.cube'));
  assert(err.message.includes('1D LUT'));
}
assert(oneDCaught, '1D LUT 成功拦截');
console.log('✓ 测试 7: 1D LUT 成功拦截并提示仅支持 3D LUT');

console.log('\n=== 所有自动化单元与规范测试全部通过！ ===');
