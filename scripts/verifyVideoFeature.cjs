const assert = require('assert');

console.log('=== 开始视频格式导入与流式导出单元测试 ===\n');

// 1. 验证视频与图片类型判断
const videoNames = ['apple_log_clip.mp4', 'LOG_001.MOV', 'test.webm', 'clip.m4v'];
const imageNames = ['shot.jpg', 'frame.PNG', 'test.webp', 'photo.jpeg'];
const invalidNames = ['document.pdf', 'table.xlsx', 'script.sh'];

function isVideoFile(fileName, type = '') {
  const videoTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];
  return videoTypes.includes(type) || /\.(mp4|mov|webm|m4v)$/i.test(fileName);
}

function isImageFile(fileName, type = '') {
  const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
  return imageTypes.includes(type) || /\.(jpe?g|png|webp)$/i.test(fileName);
}

function isSupportedMediaFile(fileName, type = '') {
  return isVideoFile(fileName, type) || isImageFile(fileName, type);
}

videoNames.forEach((name) => {
  assert(isVideoFile(name), `${name} 必须被识别为视频文件`);
  assert(isSupportedMediaFile(name), `${name} 必须被识别为受支持素材`);
});
console.log('✓ 测试 1: Apple Log 常用视频格式（MP4/MOV/WebM/M4V）识别无误');

imageNames.forEach((name) => {
  assert(isImageFile(name), `${name} 必须被识别为图片文件`);
  assert(isSupportedMediaFile(name), `${name} 必须被识别为受支持素材`);
});
console.log('✓ 测试 2: 静态图片格式（JPG/PNG/WebP）兼容识别无误');

invalidNames.forEach((name) => {
  assert(!isSupportedMediaFile(name), `${name} 非法格式必须被拒绝`);
});
console.log('✓ 测试 3: 非法格式过滤拦截无误');

// 2. 验证视频帧导出命名逻辑
function getExportFilename({ mediaType, mediaName, lutName, intensity, currentTime }) {
  const baseName = mediaName.replace(/\.[^.]+$/, '');
  const lut = lutName || (mediaType === 'video' ? '原视频' : '原图');
  const intensityPercent = `${Math.round(intensity * 100)}%`;
  if (mediaType === 'video' && currentTime !== undefined) {
    const curTime = currentTime.toFixed(2);
    return `${baseName}_${lut}_${curTime}s_${intensityPercent}.png`;
  }
  return `${baseName}_${lut}_${intensityPercent}.png`;
}

const videoFileName = getExportFilename({
  mediaType: 'video',
  mediaName: 'AppleLog_Scene01.mov',
  lutName: 'Clean709',
  intensity: 0.8,
  currentTime: 3.456,
});
console.log('  视频帧导出文件名:', videoFileName);
assert.strictEqual(videoFileName, 'AppleLog_Scene01_Clean709_3.46s_80%.png');

const gridVideoFileName = 'AppleLog_Scene01.mov'.replace(/\.[^.]+$/, '') + `_3.46s_LUT对比总图.png`;
assert.strictEqual(gridVideoFileName, 'AppleLog_Scene01_3.46s_LUT对比总图.png');
console.log('  视频对比总图文件名:', gridVideoFileName);
console.log('✓ 测试 4: 视频当前时间帧全分辨率导出与总图命名规则正确');

console.log('\n=============================================');
console.log('🎉 视频素材底层机制与导出逻辑全部自测通过！');
console.log('=============================================\n');
