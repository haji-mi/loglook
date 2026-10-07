import { useState, useCallback, useEffect } from 'react';
import { LoadedMedia, ParsedLut, AppError } from './types';
import { parseCubeContent, sortLutList } from './utils/cubeParser';
import { loadSourceMedia } from './utils/mediaLoader';
import { exportGridComparison } from './utils/exportHelper';
import { UploadView } from './components/UploadView';
import { Header } from './components/Header';
import { GridView } from './components/GridView';
import { DetailView } from './components/DetailView';
import { ErrorToast } from './components/ErrorToast';

export function App() {
  const [image, setImage] = useState<LoadedMedia | null>(null);
  const [luts, setLuts] = useState<ParsedLut[]>([]);
  const [intensity, setIntensity] = useState<number>(1.0); // 默认 100%
  const [errors, setErrors] = useState<AppError[]>([]);

  // 视频播放相关状态
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isLoop, setIsLoop] = useState<boolean>(true);

  // 大图模式状态
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [detailLut, setDetailLut] = useState<ParsedLut | null>(null);

  // 正在导出总图状态
  const [isExportingGrid, setIsExportingGrid] = useState<boolean>(false);

  // 添加错误信息
  const addError = useCallback((fileName: string, message: string) => {
    const newError: AppError = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      fileName,
      message,
    };
    setErrors((prev) => [...prev, newError]);
  }, []);

  const dismissError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((err) => err.id !== id));
  }, []);

  // 监听视频元素的播放与时间变化
  useEffect(() => {
    if (!image || image.type !== 'video' || !image.videoElement) {
      setIsVideoPlaying(false);
      setVideoCurrentTime(0);
      setVideoDuration(0);
      return;
    }

    const video = image.videoElement;
    setVideoDuration(video.duration || 0);
    setVideoCurrentTime(video.currentTime || 0);

    const onPlay = () => setIsVideoPlaying(true);
    const onPause = () => setIsVideoPlaying(false);
    const onTimeUpdate = () => setVideoCurrentTime(video.currentTime);
    const onLoadedMetadata = () => setVideoDuration(video.duration);
    const onEnded = () => {
      if (!video.loop) {
        setIsVideoPlaying(false);
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('ended', onEnded);
    };
  }, [image]);

  // 切换视频播放/暂停
  const handleTogglePlay = useCallback(() => {
    if (!image?.videoElement) return;
    if (image.videoElement.paused) {
      image.videoElement.play().catch((err) => {
        console.warn('播放失败:', err);
      });
    } else {
      image.videoElement.pause();
    }
  }, [image]);

  // 跳转时间轴
  const handleSeekVideo = useCallback(
    (time: number) => {
      if (!image?.videoElement) return;
      image.videoElement.currentTime = time;
      setVideoCurrentTime(time);
    },
    [image]
  );

  // 切换循环播放
  const handleToggleLoop = useCallback(() => {
    if (!image?.videoElement) return;
    const nextLoop = !isLoop;
    image.videoElement.loop = nextLoop;
    setIsLoop(nextLoop);
  }, [image, isLoop]);

  // 快捷键监听：空格键播放/暂停
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && image?.type === 'video') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        handleTogglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [image, handleTogglePlay]);

  // 处理原素材（视频/图片）上传
  const handleMediaSelected = useCallback(
    async (file: File) => {
      try {
        // 如果之前有正在播放的视频，先暂停
        if (image?.videoElement) {
          image.videoElement.pause();
        }
        const loaded = await loadSourceMedia(file);
        setImage(loaded);
      } catch (err) {
        addError(file.name, err instanceof Error ? err.message : '素材加载失败');
      }
    },
    [image, addError]
  );

  // 处理 LUT 文件批量上传
  const handleLutsSelected = useCallback(
    async (files: File[]) => {
      const newParsedList: ParsedLut[] = [];

      for (const file of files) {
        try {
          const text = await file.text();
          const parsed = parseCubeContent(text, file.name);
          newParsedList.push(parsed);
        } catch (err) {
          addError(file.name, err instanceof Error ? err.message : 'LUT 文件解析失败');
        }
      }

      if (newParsedList.length > 0) {
        setLuts((prev) => {
          // 合并并去重（根据文件名/名称）
          const map = new Map<string, ParsedLut>();
          prev.forEach((item) => map.set(item.name, item));
          newParsedList.forEach((item) => map.set(item.name, item));
          return sortLutList(Array.from(map.values()));
        });
      }
    },
    [addError]
  );

  // 进入大图模式
  const handleOpenDetail = useCallback((lut: ParsedLut | null) => {
    setDetailLut(lut);
    setIsDetailOpen(true);
  }, []);

  // 退出大图模式
  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false);
  }, []);

  // 导出对比总图
  const handleExportGrid = useCallback(async () => {
    if (!image || isExportingGrid) return;
    setIsExportingGrid(true);
    try {
      await exportGridComparison(image, luts, intensity);
    } catch (err) {
      console.error('导出对比总图失败:', err);
      addError('对比总图', err instanceof Error ? err.message : '导出对比总图失败');
    } finally {
      setIsExportingGrid(false);
    }
  }, [image, luts, intensity, isExportingGrid, addError]);

  return (
    <div className="min-h-screen bg-[#0d0f12] text-slate-100 flex flex-col font-sans">
      {/* 错误提示浮窗 */}
      <ErrorToast errors={errors} onDismiss={dismissError} />

      {/* 如果尚未上传素材，首屏只显示说明和上传按钮，不放示例假图 */}
      {!image ? (
        <UploadView
          onImageSelected={handleMediaSelected}
          onLutsSelected={handleLutsSelected}
        />
      ) : (
        <>
          {/* 顶部操作条 */}
          <Header
            image={image}
            intensity={intensity}
            onIntensityChange={setIntensity}
            onLutsSelected={handleLutsSelected}
            onImageSelected={handleMediaSelected}
            onExportGrid={handleExportGrid}
            isExportingGrid={isExportingGrid}
            lutCount={luts.length}
            isVideoPlaying={isVideoPlaying}
            videoCurrentTime={videoCurrentTime}
            videoDuration={videoDuration}
            onTogglePlay={handleTogglePlay}
            onSeekVideo={handleSeekVideo}
            isLoop={isLoop}
            onToggleLoop={handleToggleLoop}
          />

          {/* 网格视图 */}
          <GridView
            image={image}
            luts={luts}
            intensity={intensity}
            onSelectLutForDetail={handleOpenDetail}
            onLutsSelected={handleLutsSelected}
            isVideoPlaying={isVideoPlaying}
            videoCurrentTime={videoCurrentTime}
          />

          {/* 大图详情视图 */}
          {isDetailOpen && (
            <DetailView
              image={image}
              currentLut={detailLut}
              allLuts={luts}
              intensity={intensity}
              onIntensityChange={setIntensity}
              onSelectLut={setDetailLut}
              onBackToGrid={handleCloseDetail}
              isVideoPlaying={isVideoPlaying}
              videoCurrentTime={videoCurrentTime}
              videoDuration={videoDuration}
              onTogglePlay={handleTogglePlay}
              onSeekVideo={handleSeekVideo}
              isLoop={isLoop}
              onToggleLoop={handleToggleLoop}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
