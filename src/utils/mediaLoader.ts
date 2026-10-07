import { LoadedMedia } from '../types';

const MAX_PREVIEW_SIZE = 2048;

/**
 * 判断是否为支持的视频文件
 */
export function isVideoFile(file: File): boolean {
  const videoTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];
  return (
    videoTypes.includes(file.type) ||
    /\.(mp4|mov|webm|m4v)$/i.test(file.name)
  );
}

/**
 * 判断是否为支持的图片文件
 */
export function isImageFile(file: File): boolean {
  const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
  return (
    imageTypes.includes(file.type) ||
    /\.(jpe?g|png|webp)$/i.test(file.name)
  );
}

/**
 * 判断文件是否为支持的素材（视频或图片）
 */
export function isSupportedMediaFile(file: File): boolean {
  return isVideoFile(file) || isImageFile(file);
}

/**
 * 加载图片素材
 */
async function loadSourceImage(file: File): Promise<LoadedMedia> {
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
        type: 'image',
        file,
        name: file.name,
        originalWidth: origW,
        originalHeight: origH,
        previewWidth: prevW,
        previewHeight: prevH,
        originalImageElement: img,
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

/**
 * 加载视频素材（支持 Apple Log 拍摄的 MP4、MOV、WebM 等视频）
 */
async function loadSourceVideo(file: File): Promise<LoadedMedia> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');

    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.muted = true;
    video.loop = true;
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';

    let resolved = false;

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onMetadata);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('error', onError);
    };

    const onError = () => {
      cleanup();
      URL.revokeObjectURL(objectUrl);
      const isMov = /\.mov$/i.test(file.name);
      if (isMov) {
        reject(
          new Error(
            `视频「${file.name}」解码失败。若此文件为 iPhone 原生 ProRes 编码的 MOV 视频，当前浏览器可能缺少解码器支持（Safari 原生支持）。建议在 iPhone/Mac Safari 中使用，或转换为 HEVC (H.265) / H.264 格式的 MP4/MOV 视频。`
          )
        );
      } else {
        reject(new Error(`视频「${file.name}」加载失败，请检查视频文件是否完整或编码是否受支持。`));
      }
    };

    const onReady = () => {
      if (resolved) return;
      const origW = video.videoWidth;
      const origH = video.videoHeight;
      if (!origW || !origH) return; // 尺寸未就绪继续等待

      resolved = true;
      cleanup();

      // 计算预览尺寸（最长边不超过 2048）
      let prevW = origW;
      let prevH = origH;
      const maxDim = Math.max(origW, origH);
      if (maxDim > MAX_PREVIEW_SIZE) {
        const scale = MAX_PREVIEW_SIZE / maxDim;
        prevW = Math.round(origW * scale);
        prevH = Math.round(origH * scale);
      }

      // 提取第 0 帧作为初始预览图 Canvas
      const prevCanvas = document.createElement('canvas');
      prevCanvas.width = prevW;
      prevCanvas.height = prevH;
      const ctx = prevCanvas.getContext('2d', { willReadFrequently: false });
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, 0, 0, prevW, prevH);
      }

      resolve({
        type: 'video',
        file,
        name: file.name,
        originalWidth: origW,
        originalHeight: origH,
        previewWidth: prevW,
        previewHeight: prevH,
        duration: video.duration || 0,
        videoElement: video,
        previewCanvas: prevCanvas,
      });
    };

    const onMetadata = () => {
      // 视频元数据已加载，将时间点移到 0
      video.currentTime = 0;
      if (video.readyState >= 2) {
        onReady();
      }
    };

    video.addEventListener('loadedmetadata', onMetadata);
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('error', onError);

    // 设置超时保护（15秒）
    setTimeout(() => {
      if (!resolved) {
        cleanup();
        onError();
      }
    }, 15000);

    video.src = objectUrl;
    video.load();
  });
}

/**
 * 统一加载素材接口（根据文件类型自动分流为视频或图片）
 */
export async function loadSourceMedia(file: File): Promise<LoadedMedia> {
  if (isVideoFile(file)) {
    return loadSourceVideo(file);
  } else if (isImageFile(file)) {
    return loadSourceImage(file);
  } else {
    throw new Error(
      `文件「${file.name}」格式不受支持。支持 Apple Log 视频（MP4、MOV、WebM）或静态图片（JPG、PNG、WebP）。`
    );
  }
}
