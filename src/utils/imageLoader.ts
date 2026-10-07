import { LoadedMedia } from '../types';
import { loadSourceMedia } from './mediaLoader';

/**
 * 兼容旧模块引用的图片/媒体加载器
 */
export async function loadSourceImage(file: File): Promise<LoadedMedia> {
  return loadSourceMedia(file);
}

export { loadSourceMedia };
