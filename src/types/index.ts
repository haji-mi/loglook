export interface ParsedLut {
  id: string;
  name: string;
  fileName: string;
  size: number; // 17, 33, 65 等
  domainMin: [number, number, number];
  domainMax: [number, number, number];
  // 3D 纹理 RGBA 数据，尺寸为 size * size * size * 4
  data: Float32Array;
  // 同时也准备一份 Uint8Array 数据，针对部分不支持 Float 3D 纹理的特殊设备做最佳兜底
  byteData: Uint8Array;
}

export interface LoadedImage {
  file: File;
  name: string;
  originalWidth: number;
  originalHeight: number;
  previewWidth: number;
  previewHeight: number;
  // 完整分辨率的 Image 对象
  originalElement: HTMLImageElement;
  // 缩放到最长边 <= 2048 的 ImageBitmap 或 Canvas，保证流畅交互
  previewCanvas: HTMLCanvasElement;
}

export interface AppError {
  id: string;
  fileName: string;
  message: string;
}
