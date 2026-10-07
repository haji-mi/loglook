import { LoadedImage, ParsedLut } from '../types';
import { WebGLLutRenderer } from './webglLutRenderer';

/**
 * 触发文件下载
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getMediaSource(image: LoadedImage): TexImageSource {
  if (image.type === 'video' && image.videoElement) {
    return image.videoElement;
  }
  return (image.originalImageElement || image.originalElement || image.previewCanvas) as TexImageSource;
}

/**
 * 导出单个 LUT 的全分辨率成品图（PNG，按原始分辨率重新渲染）
 */
export async function exportSingleFullResolution(
  image: LoadedImage,
  lut: ParsedLut | null,
  intensity: number
): Promise<void> {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = image.originalWidth;
  exportCanvas.height = image.originalHeight;

  const renderer = new WebGLLutRenderer(exportCanvas);
  try {
    const source = getMediaSource(image);
    renderer.setImageSource(source, image.originalWidth, image.originalHeight);
    renderer.render({
      lut,
      intensity,
      enableSplit: false,
      targetWidth: image.originalWidth,
      targetHeight: image.originalHeight,
    });

    const blob = await new Promise<Blob | null>((resolve) => {
      exportCanvas.toBlob(resolve, 'image/png');
    });

    if (!blob) {
      throw new Error('生成图片数据失败');
    }

    const baseName = image.name.replace(/\.[^.]+$/, '');
    const lutName = lut ? lut.name : (image.type === 'video' ? '原视频' : '原图');
    const intensityPercent = `${Math.round(intensity * 100)}%`;
    let filename: string;
    if (image.type === 'video' && image.videoElement) {
      const curTime = image.videoElement.currentTime.toFixed(2);
      filename = `${baseName}_${lutName}_${curTime}s_${intensityPercent}.png`;
    } else {
      filename = `${baseName}_${lutName}_${intensityPercent}.png`;
    }

    triggerDownload(blob, filename);
  } finally {
    renderer.destroy();
  }
}

/**
 * 导出带名称标注的网格对比总图
 */
export async function exportGridComparison(
  image: LoadedImage,
  luts: ParsedLut[],
  intensity: number
): Promise<void> {
  // 总格数：1（原图） + luts.length
  const totalItems = 1 + luts.length;
  if (totalItems <= 0) return;

  // 决定网格列数
  let cols = 3;
  if (totalItems <= 2) cols = totalItems;
  else if (totalItems <= 4) cols = 2;
  else cols = 3;

  const rows = Math.ceil(totalItems / cols);

  // 单格渲染尺寸：兼顾清晰度与内存性能，最长边设为 1200
  const maxCellDim = 1200;
  const aspect = image.originalWidth / image.originalHeight;
  let cellW = maxCellDim;
  let cellH = Math.round(cellW / aspect);
  if (cellH > maxCellDim) {
    cellH = maxCellDim;
    cellW = Math.round(cellH * aspect);
  }

  const padding = 24;
  const gap = 20;
  const labelHeight = 44;

  const totalWidth = padding * 2 + cols * cellW + (cols - 1) * gap;
  const totalHeight = padding * 2 + rows * (cellH + labelHeight) + (rows - 1) * gap;

  const totalCanvas = document.createElement('canvas');
  totalCanvas.width = totalWidth;
  totalCanvas.height = totalHeight;
  const ctx = totalCanvas.getContext('2d');
  if (!ctx) throw new Error('无法创建对比总图画布');

  // 深色背景
  ctx.fillStyle = '#0d0f12';
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // 离屏 WebGL 渲染器，复用原图
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = cellW;
  offscreenCanvas.height = cellH;
  const renderer = new WebGLLutRenderer(offscreenCanvas);

  try {
    const source = getMediaSource(image);
    renderer.setImageSource(source, cellW, cellH);

    // 依次绘制每个单元格
    for (let index = 0; index < totalItems; index++) {
      const col = index % cols;
      const row = Math.floor(index / cols);

      const x = padding + col * (cellW + gap);
      const y = padding + row * (cellH + labelHeight + gap);

      const isOriginal = index === 0;
      const currentLut = isOriginal ? null : luts[index - 1];
      const title = isOriginal 
        ? (image.type === 'video' ? '原视频 (Apple Log)' : '原图 (Apple Log)')
        : currentLut!.name;

      // WebGL 渲染当前格图像
      renderer.render({
        lut: currentLut,
        intensity: isOriginal ? 1.0 : intensity,
        enableSplit: false,
        targetWidth: cellW,
        targetHeight: cellH,
      });

      // 绘制图像
      ctx.drawImage(offscreenCanvas, x, y, cellW, cellH);

      // 单元格边框与阴影效果
      ctx.strokeStyle = '#2a313d';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cellW, cellH + labelHeight);

      // 绘制标注底色
      const labelY = y + cellH;
      ctx.fillStyle = '#16191f';
      ctx.fillRect(x, labelY, cellW, labelHeight);

      // 绘制标注文字
      ctx.fillStyle = isOriginal ? '#94a3b8' : '#38bdf8';
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, x + 16, labelY + labelHeight / 2);

      // 如果是 LUT，还标上当前强度
      if (!isOriginal) {
        ctx.fillStyle = '#64748b';
        ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`强度 ${Math.round(intensity * 100)}%`, x + cellW - 16, labelY + labelHeight / 2);
      }
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      totalCanvas.toBlob(resolve, 'image/png');
    });

    if (!blob) throw new Error('生成总图数据失败');

    const baseName = image.name.replace(/\.[^.]+$/, '');
    let filename: string;
    if (image.type === 'video' && image.videoElement) {
      const curTime = image.videoElement.currentTime.toFixed(2);
      filename = `${baseName}_${curTime}s_LUT对比总图.png`;
    } else {
      filename = `${baseName}_LUT对比总图.png`;
    }
    triggerDownload(blob, filename);
  } finally {
    renderer.destroy();
  }
}
