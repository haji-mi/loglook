import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Download, Sliders, ChevronLeft, ChevronRight } from 'lucide-react';
import { LoadedImage, ParsedLut } from '../types';
import { WebGLLutRenderer } from '../utils/webglLutRenderer';
import { exportSingleFullResolution } from '../utils/exportHelper';

interface DetailViewProps {
  image: LoadedImage;
  currentLut: ParsedLut | null;
  allLuts: ParsedLut[];
  intensity: number;
  onIntensityChange: (val: number) => void;
  onSelectLut: (lut: ParsedLut | null) => void;
  onBackToGrid: () => void;
}

export const DetailView: React.FC<DetailViewProps> = ({
  image,
  currentLut,
  allLuts,
  intensity,
  onIntensityChange,
  onSelectLut,
  onBackToGrid,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLLutRenderer | null>(null);

  const [splitPos, setSplitPos] = useState<number>(0.5); // 0.0 ~ 1.0
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // 初始化 WebGL2 渲染器并绑定预览纹理
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const renderer = new WebGLLutRenderer(canvas);
      rendererRef.current = renderer;

      // 绑定原图
      renderer.setImageSource(
        image.previewCanvas,
        image.previewWidth,
        image.previewHeight
      );

      // 初次渲染
      renderer.render({
        lut: currentLut,
        intensity,
        enableSplit: true,
        splitPosition: splitPos,
        targetWidth: image.previewWidth,
        targetHeight: image.previewHeight,
      });
    } catch (err) {
      console.error('大图模式初始化 WebGL2 失败:', err);
    }

    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, [image]);

  // 响应 LUT、强度、分割位置变化实时渲染
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    renderer.render({
      lut: currentLut,
      intensity,
      enableSplit: true,
      splitPosition: splitPos,
      targetWidth: image.previewWidth,
      targetHeight: image.previewHeight,
    });
  }, [currentLut, intensity, splitPos, image]);

  // 支持键盘快捷键：Esc 返回
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBackToGrid();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBackToGrid]);

  // 鼠标与触摸拖动分割滑杆处理
  const updateSplitFromPointer = useCallback((clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0) return;

    const relativeX = clientX - rect.left;
    const clampedRatio = Math.max(0.01, Math.min(0.99, relativeX / rect.width));
    setSplitPos(clampedRatio);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    updateSplitFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateSplitFromPointer(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // 忽略无法 release 的情况
    }
  };

  // 导出单图全分辨率
  const handleExportSingle = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await exportSingleFullResolution(image, currentLut, intensity);
    } catch (err) {
      console.error('全分辨率导出失败:', err);
      alert(err instanceof Error ? err.message : '全分辨率导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  const percentage = Math.round(intensity * 100);

  return (
    <div className="fixed inset-0 z-40 bg-[#0d0f12] flex flex-col select-none overflow-hidden">
      {/* 顶部操作条 */}
      <div className="h-14 bg-[#16191f]/95 border-b border-[#2a313d] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToGrid}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
            title="返回对比网格 (Esc)"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
            <span>返回网格</span>
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span className="font-semibold text-white text-sm">
              {currentLut ? currentLut.name : '原图 (Apple Log)'}
            </span>
            {currentLut && (
              <span className="text-xs text-slate-400 font-mono">
                ({currentLut.size}×{currentLut.size}×{currentLut.size})
              </span>
            )}
          </div>
        </div>

        {/* 中间强度滑杆 */}
        <div className="flex items-center gap-2.5 bg-[#0d0f12]/80 px-3 py-1 rounded-xl border border-slate-800">
          <Sliders className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="text-xs font-medium text-slate-300 hidden md:inline">
            LUT 强度
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={percentage}
            onChange={(e) => onIntensityChange(parseFloat(e.target.value) / 100)}
            className="w-20 sm:w-28 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
          <span className="text-xs font-mono font-semibold text-sky-400 w-9 text-right">
            {percentage}%
          </span>
        </div>

        {/* 右侧：单图全分辨率导出 */}
        <button
          onClick={handleExportSingle}
          disabled={isExporting}
          className={`px-3.5 py-1.5 rounded-xl text-white text-xs sm:text-sm font-medium transition-all shadow-md flex items-center gap-1.5 ${
            isExporting
              ? 'bg-sky-800 text-slate-300 cursor-not-allowed'
              : 'bg-sky-600 hover:bg-sky-500 shadow-sky-900/30'
          }`}
          title="按原始相机分辨率无损导出 PNG"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? '正在渲染导出...' : '导出全分辨率单图'}</span>
        </button>
      </div>

      {/* 中间大图视图与分割滑杆 */}
      <div
        ref={containerRef}
        className="flex-1 relative flex items-center justify-center p-3 sm:p-6 bg-[#0a0c0e] overflow-hidden"
      >
        <div
          className="relative max-w-full max-h-full flex items-center justify-center cursor-ew-resize touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* WebGL2 画布 */}
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-[calc(100vh-140px)] object-contain rounded-xl shadow-2xl border border-slate-800/80 pointer-events-none"
          />

          {/* 分割线指示手柄 (覆盖在画布上) */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none flex flex-col items-center justify-center -translate-x-1/2"
            style={{ left: `${splitPos * 100}%` }}
          >
            {/* 分割指示线 */}
            <div className="w-[2px] h-full bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)]" />

            {/* 圆形可拖拽手柄 */}
            <div className="absolute w-8 h-8 rounded-full bg-white text-slate-900 shadow-xl flex items-center justify-center border-2 border-slate-900/40">
              <ChevronLeft className="w-3.5 h-3.5 -mr-1" />
              <ChevronRight className="w-3.5 h-3.5 -ml-1" />
            </div>
          </div>

          {/* 左原图 / 右效果浮层指示标 */}
          <div className="absolute top-4 left-4 pointer-events-none">
            <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-sm text-[11px] font-medium text-slate-300 border border-white/10 shadow-lg">
              ◀ 左侧：原图
            </span>
          </div>
          <div className="absolute top-4 right-4 pointer-events-none">
            <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-sm text-[11px] font-medium text-sky-300 border border-sky-400/20 shadow-lg">
              右侧：{currentLut ? currentLut.name : '原图'} ▶
            </span>
          </div>
        </div>
      </div>

      {/* 底部 LUT 快捷切换栏 */}
      <div className="h-16 bg-[#16191f] border-t border-[#2a313d] px-4 flex items-center gap-2 overflow-x-auto shrink-0">
        <span className="text-xs text-slate-500 font-medium shrink-0 mr-1">
          切换对比：
        </span>

        {allLuts.map((lut) => {
          const isSelected = currentLut?.id === lut.id;
          return (
            <button
              key={lut.id}
              onClick={() => onSelectLut(lut)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border ${
                isSelected
                  ? 'bg-sky-500 text-white border-sky-400 shadow-sm'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700/80'
              }`}
            >
              <span>{lut.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
