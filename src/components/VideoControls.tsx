import React, { useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Film } from 'lucide-react';

interface VideoControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  isLoop?: boolean;
  onToggleLoop?: () => void;
  compact?: boolean;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const dec = Math.floor((seconds % 1) * 10);
  const mStr = String(mins).padStart(2, '0');
  const sStr = String(secs).padStart(2, '0');
  return `${mStr}:${sStr}.${dec}`;
}

export const VideoControls: React.FC<VideoControlsProps> = ({
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  isLoop = true,
  onToggleLoop,
  compact = false,
}) => {
  const handleProgressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const targetTime = parseFloat(e.target.value);
      onSeek(targetTime);
    },
    [onSeek]
  );

  const handleStep = useCallback(
    (deltaSeconds: number) => {
      const nextTime = Math.max(0, Math.min(duration, currentTime + deltaSeconds));
      onSeek(nextTime);
    },
    [currentTime, duration, onSeek]
  );

  return (
    <div
      className={`flex items-center gap-2 sm:gap-3 px-3 py-1.5 rounded-xl bg-[#16191f]/90 border border-slate-700/80 backdrop-blur-md shadow-lg ${
        compact ? 'text-xs' : 'text-sm'
      }`}
    >
      {/* 视频徽标 */}
      <div className="hidden sm:flex items-center gap-1.5 text-sky-400 font-medium text-xs border-r border-slate-700/80 pr-2 shrink-0">
        <Film className="w-3.5 h-3.5" />
        <span>Log 视频</span>
      </div>

      {/* 播放 / 暂停切换 */}
      <button
        type="button"
        onClick={onTogglePlay}
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center transition-all shrink-0 shadow-sm shadow-sky-900/40"
        title={isPlaying ? '暂停 (空格键)' : '播放 (空格键)'}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      {/* 单帧前进/后退微调 */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => handleStep(-1 / 30)}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="上一帧 (-1/30s)"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleStep(1 / 30)}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="下一帧 (+1/30s)"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 进度拖动条 */}
      <div className="flex-1 flex items-center gap-2 min-w-[120px] sm:min-w-[180px]">
        <div className="relative w-full flex items-center">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.01"
            value={currentTime}
            onChange={handleProgressChange}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400 focus:outline-none"
            title="拖动跳转时间轴"
          />
        </div>
      </div>

      {/* 时间戳指示 */}
      <div className="font-mono text-[11px] sm:text-xs text-slate-400 whitespace-nowrap shrink-0">
        <span className="text-white font-semibold">{formatTime(currentTime)}</span>
        <span className="text-slate-600 mx-1">/</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* 循环播放开关 */}
      {onToggleLoop && (
        <button
          type="button"
          onClick={onToggleLoop}
          className={`p-1.5 rounded-md transition-colors shrink-0 ${
            isLoop
              ? 'text-sky-400 bg-sky-950/40 hover:bg-sky-900/50'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          }`}
          title={isLoop ? '循环播放已开启' : '循环播放已关闭'}
        >
          <Repeat className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
