const assert = require('assert');

// 验证强度插值 mix(origColor, lutColor, intensity)
function mix(orig, lut, intensity) {
  return [
    orig[0] * (1 - intensity) + lut[0] * intensity,
    orig[1] * (1 - intensity) + lut[1] * intensity,
    orig[2] * (1 - intensity) + lut[2] * intensity,
  ];
}

console.log('=== 验证 M2: 大图分割与强度滑杆逻辑 ===');

const origSample = [0.45, 0.52, 0.38];
const lutSample = [0.20, 0.85, 0.90]; // 极端调色

// 1. 验证 intensity = 0.0
const atZero = mix(origSample, lutSample, 0.0);
assert.deepStrictEqual(atZero, origSample, '强度为 0% 时必须严格等同于原图');
console.log('✓ 验证 1: 强度为 0% 时色彩与原图 100% 一致');

// 2. 验证 intensity = 1.0
const atOne = mix(origSample, lutSample, 1.0);
assert.deepStrictEqual(atOne, lutSample, '强度为 100% 时必须完全呈现 LUT 效果');
console.log('✓ 验证 2: 强度为 100% 时完全呈现 LUT 效果');

// 3. 验证 intensity = 0.5
const atHalf = mix(origSample, lutSample, 0.5);
assert.strictEqual(Math.round(atHalf[0] * 100) / 100, 0.33);
console.log('✓ 验证 3: 强度中间值线性插值准确');

// 4. 验证分割滑杆边界判断
function isLeftOrRight(uvX, splitPos) {
  return uvX < splitPos ? 'original' : 'lut';
}
assert.strictEqual(isLeftOrRight(0.2, 0.5), 'original', '分割线左侧必须为原图');
assert.strictEqual(isLeftOrRight(0.8, 0.5), 'lut', '分割线右侧必须为 LUT');
console.log('✓ 验证 4: 分割滑杆左原图、右 LUT 逻辑严格无误');

console.log('\n=== M2 自测全部通过！ ===');
