import { useState, useCallback } from 'react';
import { LoadedImage, ParsedLut, AppError } from './types';
import { parseCubeContent, sortLutList } from './utils/cubeParser';
import { loadSourceImage } from './utils/imageLoader';
import { exportGridComparison } from './utils/exportHelper';
import { UploadView } from './components/UploadView';
import { Header } from './components/Header';
import { GridView } from './components/GridView';
import { DetailView } from './components/DetailView';
import { ErrorToast } from './components/ErrorToast';

export function App() {
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [luts, setLuts] = useState<ParsedLut[]>([]);
  const [intensity, setIntensity] = useState<number>(1.0); // 默认 100%
  const [errors, setErrors] = useState<AppError[]>([]);

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

  // 处理原图上传
  const handleImageSelected = useCallback(async (file: File) => {
    try {
      const loaded = await loadSourceImage(file);
      setImage(loaded);
    } catch (err) {
      addError(file.name, err instanceof Error ? err.message : '原图加载失败');
    }
  }, [addError]);

  // 处理 LUT 文件批量上传
  const handleLutsSelected = useCallback(async (files: File[]) => {
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
  }, [addError]);

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

      {/* 如果尚未上传图片，首屏只显示说明和上传按钮，不放示例假图 */}
      {!image ? (
        <UploadView
          onImageSelected={handleImageSelected}
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
            onImageSelected={handleImageSelected}
            onExportGrid={handleExportGrid}
            isExportingGrid={isExportingGrid}
            lutCount={luts.length}
          />

          {/* 网格视图 */}
          <GridView
            image={image}
            luts={luts}
            intensity={intensity}
            onSelectLutForDetail={handleOpenDetail}
            onLutsSelected={handleLutsSelected}
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
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
