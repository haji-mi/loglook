import React, { useRef } from 'react';
import { Sliders, Plus, Download, RotateCcw, Film } from 'lucide-react';
import { LoadedImage } from '../types';
import { VideoControls } from './VideoControls';

interface HeaderProps {
  image: LoadedImage;
  intensity: number; // 0 ~ 1
  onIntensityChange: (val: number) => void;
  onLutsSelected: (files: File[]) => void;
  onImageSelected: (file: File) => void;
  onExportGrid: () => void;
  isExportingGrid: boolean;
  lutCount: number;
  // 视频控制参数
  isVideoPlaying?: boolean;
  videoCurrentTime?: number;
  videoDuration?: number;
  onTogglePlay?: () => void;
  onSeekVideo?: (time: number) => void;
  isLoop?: boolean;
  onToggleLoop?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  image,
  intensity,
  onIntensityChange,
  onLutsSelected,
  onImageSelected,
  onExportGrid,
  isExportingGrid,
  lutCount,
  isVideoPlaying = false,
  videoCurrentTime = 0,
  videoDuration = 0,
  onTogglePlay,
  onSeekVideo,
  isLoop = true,
  onToggleLoop,
}) => {
  const lutInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const percentage = Math.round(intensity * 100);
  const isVideo = image.type === 'video';

  return (
    <header className="sticky top-0 z-30 bg-[#16191f]/95 backdrop-blur-md border-b border-[#2a313d] px-4 py-2.5 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-2.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* 左侧：Logo 与当前素材信息 */}
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 font-bold text-base shadow-sm">
                {isVideo ? <Film className="w-4 h-4" /> : 'L'}
              </div>
              <div>
                <div className="font-bold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
                  LogLook
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-normal border border-slate-700/60">
                    {isVideo ? 'Log 视频' : 'Log 图片'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span className="truncate max-w-[120px] sm:max-w-[180px]" title={image.name}>
                    {image.name}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span>
                    {image.originalWidth} × {image.originalHeight}
                  </span>
                </div>
              </div>
            </div>

            {/* 更换素材按钮 */}
            <button
              onClick={() => mediaInputRef.current?.click()}
              className="md:ml-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700/80 transition-colors flex items-center gap-1.5 shrink-0"
              title="更换 Apple Log 视频或图片"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">更换素材</span>
            </button>
            <input
              ref={mediaInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-m4v,image/jpeg,image/png,image/webp,.mp4,.mov,.webm,.m4v,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImageSelected(file);
              }}
            />
          </div>

          {/* 中间/右侧：LUT 强度滑杆与操作按键 */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4">
            {/* 全局强度滑杆 */}
            <div className="flex items-center gap-2.5 bg-[#0d0f12]/80 px-3.5 py-1.5 rounded-xl border border-slate-800 flex-1 sm:flex-initial">
              <Sliders className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-xs font-medium text-slate-300 whitespace-nowrap">
                LUT 强度
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={percentage}
                onChange={(e) => onIntensityChange(parseFloat(e.target.value) / 100)}
                className="w-24 sm:w-32 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
              <span className="text-xs font-mono font-semibold text-sky-400 w-10 text-right">
                {percentage}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* 导入更多 LUT */}
              <button
                onClick={() => lutInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>导入 LUT</span>
                {lutCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-300">
                    {lutCount}
                  </span>
                )}
              </button>
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

              {/* 导出对比总图 */}
              {lutCount > 0 && (
                <button
                  onClick={onExportGrid}
                  disabled={isExportingGrid}
                  className={`px-3 py-1.5 rounded-xl text-white text-xs sm:text-sm font-medium transition-all shadow-sm flex items-center gap-1.5 ${
                    isExportingGrid
                      ? 'bg-sky-800 text-slate-300 cursor-not-allowed'
                      : 'bg-sky-600 hover:bg-sky-500 shadow-sky-900/30'
                  }`}
                  title={isVideo ? '导出当前视频帧的对比总图' : '导出带名称标注的对比总图'}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {isExportingGrid
                      ? '正在生成...'
                      : isVideo
                      ? '导出当前帧总图'
                      : '导出对比总图'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 若为视频，渲染顶部时间轴播放控制条 */}
        {isVideo && onTogglePlay && onSeekVideo && (
          <div className="w-full pt-1 border-t border-slate-800/80">
            <VideoControls
              isPlaying={isVideoPlaying}
              onTogglePlay={onTogglePlay}
              currentTime={videoCurrentTime}
              duration={videoDuration}
              onSeek={onSeekVideo}
              isLoop={isLoop}
              onToggleLoop={onToggleLoop}
            />
          </div>
        )}
      </div>
    </header>
  );
};
