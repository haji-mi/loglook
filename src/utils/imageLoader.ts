import { LoadedImage } from '../types';

const MAX_PREVIEW_SIZE = 2048;

/**
 * 加载图片文件并生成流畅预览画布与保留原始分辨率元素
 */
export async function loadSourceImage(file: File): Promise<LoadedImage> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
    throw new Error(`文件「${file.name}」格式不受支持，请上传 JPG、PNG 或 WebP 格式的图片`);
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const origW = img.naturalWidth;
      const origH = img.naturalHeight;

      if (!origW || !origH) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error(`无法读取图片「${file.name}」的分辨率`));
        return;
      }

      // 计算预览尺寸（最长边不超过 2048）
      let prevW = origW;
      let prevH = origH;
      const maxDim = Math.max(origW, origH);

      if (maxDim > MAX_PREVIEW_SIZE) {
        const scale = MAX_PREVIEW_SIZE / maxDim;
        prevW = Math.round(origW * scale);
        prevH = Math.round(origH * scale);
      }

      // 创建预览 Canvas
      const prevCanvas = document.createElement('canvas');
      prevCanvas.width = prevW;
      prevCanvas.height = prevH;
      const ctx = prevCanvas.getContext('2d', { willReadFrequently: false });
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('无法创建 2D 画布上下文'));
        return;
      }

      // 直接高质量绘制预览缩放图，不做任何 gamma/曝光矫正
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, prevW, prevH);

      resolve({
        file,
        name: file.name,
        originalWidth: origW,
        originalHeight: origH,
        previewWidth: prevW,
        previewHeight: prevH,
        originalElement: img,
        previewCanvas: prevCanvas,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`图片「${file.name}」加载失败，可能文件损坏`));
    };

    img.src = objectUrl;
  });
}
