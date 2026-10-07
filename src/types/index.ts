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

export type MediaType = 'image' | 'video';

export interface LoadedMedia {
  type: MediaType;
  file: File;
  name: string;
  originalWidth: number;
  originalHeight: number;
  previewWidth: number;
  previewHeight: number;
  duration?: number; // 视频时长（秒）
  // 完整分辨率的 Image 对象（若为图片）
  originalImageElement?: HTMLImageElement;
  // 兼容旧代码引用
  originalElement?: HTMLImageElement;
  // 视频元素（若为视频）
  videoElement?: HTMLVideoElement;
  // 预览 Canvas（对于图片是缩小预览；对于视频是当前帧预览）
  previewCanvas: HTMLCanvasElement;
}

export type LoadedImage = LoadedMedia;

export interface AppError {
  id: string;
  fileName: string;
  message: string;
}
