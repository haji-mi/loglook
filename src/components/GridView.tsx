import React, { useEffect, useRef } from 'react';
import { LoadedImage, ParsedLut } from '../types';
import { WebGLLutRenderer } from '../utils/webglLutRenderer';
import { UploadCloud, Maximize2 } from 'lucide-react';

interface GridViewProps {
  image: LoadedImage;
  luts: ParsedLut[];
  intensity: number;
  onSelectLutForDetail: (lut: ParsedLut | null) => void;
  onLutsSelected: (files: File[]) => void;
}

export const GridView: React.FC<GridViewProps> = ({
  image,
  luts,
  intensity,
  onSelectLutForDetail,
  onLutsSelected,
}) => {
  const lutInputRef = useRef<HTMLInputElement>(null);

  // 为每个格子存储 2D Canvas 的引用
  // key: 'original' 或 lut.id
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  // 维护一个共享的 WebGL2 离屏渲染器
  const rendererRef = useRef<WebGLLutRenderer | null>(null);

  // 初始化共享渲染器
  useEffect(() => {
    try {
      const offscreenCanvas = document.createElement('canvas');
      const renderer = new WebGLLutRenderer(offscreenCanvas);
      rendererRef.current = renderer;

      // 绑定原图预览源
      renderer.setImageSource(
        image.previewCanvas,
        image.previewWidth,
        image.previewHeight
      );
    } catch (err) {
      console.error('初始化 WebGL2 渲染器失败:', err);
    }

    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, [image]);

  // 当原图、LUT列表或强度更新时，重绘所有格子
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    // 1. 渲染「原图」格子
    const origCanvas = canvasRefs.current.get('original');
    if (origCanvas) {
      if (origCanvas.width !== image.previewWidth || origCanvas.height !== image.previewHeight) {
        origCanvas.width = image.previewWidth;
        origCanvas.height = image.previewHeight;
      }
      renderer.render({
        lut: null,
        intensity: 1.0,
        enableSplit: false,
        targetWidth: image.previewWidth,
        targetHeight: image.previewHeight,
      });
      renderer.copyTo2DCanvas(origCanvas);
    }

    // 2. 依次渲染各个 LUT 格子
    luts.forEach((lut) => {
      const canvas = canvasRefs.current.get(lut.id);
      if (!canvas) return;

      if (canvas.width !== image.previewWidth || canvas.height !== image.previewHeight) {
        canvas.width = image.previewWidth;
        canvas.height = image.previewHeight;
      }

      renderer.render({
        lut,
        intensity,
        enableSplit: false,
        targetWidth: image.previewWidth,
        targetHeight: image.previewHeight,
      });
      renderer.copyTo2DCanvas(canvas);
    });
  }, [image, luts, intensity]);

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
      {/* 提示信息 */}
      <div className="flex items-center justify-between mb-5">
        <div className="text-xs sm:text-sm text-slate-400">
          点击任意卡片进入全屏大图，使用可拖动滑杆进行细节左右对比
        </div>
        <div className="text-xs text-slate-500 font-mono">
          共 {1 + luts.length} 个视口
        </div>
      </div>

      {/* 对比网格布局：
          手机端 1 列或 2 列，桌面端 3 列，卡片宽窄自适应
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 第一格：永远是「原图」 */}
        <div
          onClick={() => onSelectLutForDetail(luts.length > 0 ? luts[0] : null)}
          className="group relative bg-[#16191f] rounded-2xl border border-slate-800 hover:border-sky-500/80 transition-all duration-200 overflow-hidden cursor-pointer shadow-lg hover:shadow-sky-950/20 flex flex-col"
        >
          <div className="relative aspect-video sm:aspect-auto w-full bg-[#0a0c0e] flex items-center justify-center overflow-hidden">
            <canvas
              ref={(el) => {
                if (el) canvasRefs.current.set('original', el);
                else canvasRefs.current.delete('original');
              }}
              className="w-full h-auto max-h-[360px] object-contain transition-transform duration-300 group-hover:scale-[1.01]"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="px-3.5 py-1.5 rounded-full bg-slate-900/90 text-white text-xs font-medium border border-slate-700/80 flex items-center gap-1.5 shadow-xl">
                <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                进入大图对比
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-[#16191f] border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="font-semibold text-sm text-white">原图 (Apple Log)</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              无调色
            </span>
          </div>
        </div>

        {/* 之后每格一个 LUT 并标注名称 */}
        {luts.map((lut) => (
          <div
            key={lut.id}
            onClick={() => onSelectLutForDetail(lut)}
            className="group relative bg-[#16191f] rounded-2xl border border-slate-800 hover:border-sky-500/80 transition-all duration-200 overflow-hidden cursor-pointer shadow-lg hover:shadow-sky-950/20 flex flex-col"
          >
            <div className="relative aspect-video sm:aspect-auto w-full bg-[#0a0c0e] flex items-center justify-center overflow-hidden">
              <canvas
                ref={(el) => {
                  if (el) canvasRefs.current.set(lut.id, el);
                  else canvasRefs.current.delete(lut.id);
                }}
                className="w-full h-auto max-h-[360px] object-contain transition-transform duration-300 group-hover:scale-[1.01]"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="px-3.5 py-1.5 rounded-full bg-slate-900/90 text-white text-xs font-medium border border-slate-700/80 flex items-center gap-1.5 shadow-xl">
                  <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                  进入大图对比
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-[#16191f] border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span className="font-semibold text-sm text-sky-200 group-hover:text-sky-300 transition-colors">
                  {lut.name}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {lut.size}×{lut.size}×{lut.size}
              </span>
            </div>
          </div>
        ))}

        {/* 如果 LUT 较少或尚未导入 LUT，显示引导添加卡片 */}
        {luts.length === 0 && (
          <div
            onClick={() => lutInputRef.current?.click()}
            className="group relative bg-[#16191f]/50 rounded-2xl border-2 border-dashed border-slate-800 hover:border-slate-600 transition-all duration-200 p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[260px]"
          >
            <UploadCloud className="w-10 h-10 text-slate-600 group-hover:text-slate-400 mb-3 transition-colors" />
            <div className="text-sm font-medium text-slate-300 mb-1">
              导入 .cube LUT 文件
            </div>
            <div className="text-xs text-slate-500 max-w-xs">
              支持多选 Clean709、WarmFilm、TealOrange 等 .cube 文件开始实时对比
            </div>
            <input
              ref={lutInputRef}
              type="file"
              accept=".cube"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) onLutsSelected(files);
              }}
            />
          </div>
        )}
      </div>
    </main>
  );
};
